import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface CardData {
    url: string;
    songName: string;
    artist: string;
    releaseYear: string;
}

// A4 is 210mm x 297mm
// We want a 4x3 grid with padding of about 10mm to all sides
// hence: min(floor((210-20)/3), floor((297-20)/4) = 62 for square cards
// therefore the margin has size (210-3*62)/2=12 (x axis is limiting factor)

export class PDFGenerator {
    private doc: jsPDF;
    private readonly CARD_WIDTH = 62;
    private readonly CARD_HEIGHT = 62;
    private readonly PAGE_PADDING = 12;
    private readonly CARDS_PER_ROW = 3;
    private readonly CARDS_PER_COLUMN = 4;
    private readonly CARDS_PER_PAGE = 12;

    constructor() {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
    }

    private arrayChunks<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    private async generateQRCode(url: string): Promise<string> {
        return await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'H',
            width: 400,
            margin: 1
        });
    }

    private drawCrosses(): void {
        [...Array(this.CARDS_PER_ROW + 1).keys()].map(col => {
            [...Array(this.CARDS_PER_COLUMN + 1).keys()].map(row =>
                this.drawCross(this.PAGE_PADDING + col * this.CARD_WIDTH, this.PAGE_PADDING + row * this.CARD_HEIGHT, 2))
        })
    }

    private drawCross(x: number, y: number, diameterMm: number) {
        this.doc.line(x - diameterMm / 2, y, x + diameterMm / 2, y);
        this.doc.line(x, y - diameterMm / 2, x, y + diameterMm / 2);
    }

    private drawFrontPage(cards: CardData[]): void {
        const { CARD_WIDTH, CARD_HEIGHT, PAGE_PADDING } = this;

        this.drawCrosses();

        cards.forEach((card, index) => {
            const col = index % this.CARDS_PER_ROW;
            const row = Math.floor(index / (this.CARDS_PER_COLUMN - 1));

            const x = PAGE_PADDING + (col * CARD_WIDTH);
            const y = PAGE_PADDING + (row * CARD_HEIGHT);

            const centerX = x + (CARD_WIDTH / 2);
            const centerY = y + (CARD_HEIGHT / 2);

            this.doc.setFontSize(14);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(card.artist, centerX, centerY - 15, {
                align: 'center',
                maxWidth: CARD_WIDTH - 10
            });

            this.doc.setFontSize(42);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(card.releaseYear, centerX, centerY + 5, { align: 'center' });

            this.doc.setFontSize(14);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(card.songName, centerX, centerY + 20, {
                align: 'center',
                maxWidth: CARD_WIDTH - 10
            });
        });
    }

    private async drawBackPage(cards: CardData[]) {
        const { CARD_WIDTH, CARD_HEIGHT, PAGE_PADDING } = this;

        this.drawCrosses();

        for (let index = 0; index < cards.length; index++) {
            const card = cards[index]

            const col = (this.CARDS_PER_ROW - 1) - (index % this.CARDS_PER_ROW);
            const row = Math.floor(index / (this.CARDS_PER_COLUMN - 1));

            const x = PAGE_PADDING + (col * CARD_WIDTH);
            const y = PAGE_PADDING + (row * CARD_HEIGHT);

            const qrDataUrl = await this.generateQRCode(card.url);

            const qrSize = 40;
            const qrX = x + (CARD_WIDTH - qrSize) / 2;
            const qrY = y + (CARD_HEIGHT - qrSize) / 2;

            this.doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        }
    }

    public async generatePDF(data: CardData[]): Promise<void> {
        const pageChunks = this.arrayChunks(data, this.CARDS_PER_PAGE);

        for (let pageIndex = 0; pageIndex < pageChunks.length; pageIndex++) {
            const pageCards = pageChunks[pageIndex];

            if (pageIndex > 0) {
                this.doc.addPage();
            }
            this.drawFrontPage(pageCards);

            this.doc.addPage();
            await this.drawBackPage(pageCards);
        }

        this.doc.save('playlist-qr-cards.pdf');
    }
}
