import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface CardData {
    url: string;
    song_name: string;
    artist: string;
    year: string;
}

export class PDFGenerator {
    private doc: jsPDF;
    private readonly CARD_WIDTH = 62;
    private readonly CARD_HEIGHT = 62;
    private readonly PAGE_PADDING = 30;
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

    private drawCutLines(isLastRow: boolean = false): void {
        const { CARD_WIDTH, CARD_HEIGHT, CARDS_PER_ROW, PAGE_PADDING } = this;

        const cornerSize = 1;

        this.doc.line(PAGE_PADDING, PAGE_PADDING, PAGE_PADDING + cornerSize, PAGE_PADDING);
        this.doc.line(PAGE_PADDING, PAGE_PADDING, PAGE_PADDING, PAGE_PADDING + cornerSize);

        const rightX = PAGE_PADDING + (CARDS_PER_ROW * CARD_WIDTH);
        this.doc.line(rightX - cornerSize, PAGE_PADDING, rightX, PAGE_PADDING);
        this.doc.line(rightX, PAGE_PADDING, rightX, PAGE_PADDING + cornerSize);

        const bottomY = PAGE_PADDING + (this.CARDS_PER_COLUMN * CARD_HEIGHT);
        this.doc.line(PAGE_PADDING, bottomY - cornerSize, PAGE_PADDING, bottomY);
        this.doc.line(PAGE_PADDING, bottomY, PAGE_PADDING + cornerSize, bottomY);

        this.doc.line(rightX, bottomY - cornerSize, rightX, bottomY);
        this.doc.line(rightX - cornerSize, bottomY, rightX, bottomY);

        for (let i = 1; i < CARDS_PER_ROW; i++) {
            const x = PAGE_PADDING + (i * CARD_WIDTH);

            for (let row = 0; row < this.CARDS_PER_COLUMN; row++) {
                const y = PAGE_PADDING + (row * CARD_HEIGHT);

                if (row < this.CARDS_PER_COLUMN - 1 || !isLastRow) {
                    this.doc.line(x, y, x, y + CARD_HEIGHT);
                }
            }
        }

        for (let i = 1; i < this.CARDS_PER_COLUMN; i++) {
            const y = PAGE_PADDING + (i * CARD_HEIGHT);

            for (let col = 0; col < CARDS_PER_ROW; col++) {
                const x = PAGE_PADDING + (col * CARD_WIDTH);

                this.doc.line(x, y, x + CARD_WIDTH, y);
            }
        }
    }

    private drawFrontPage(cards: CardData[]): void {
        const { CARD_WIDTH, CARD_HEIGHT, PAGE_PADDING } = this;

        this.drawCutLines(cards.length < this.CARDS_PER_PAGE);

        cards.forEach((card, index) => {
            const col = index % this.CARDS_PER_ROW;
            const row = Math.floor(index / this.CARDS_PER_ROW);

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
            this.doc.text(card.year, centerX, centerY + 5, { align: 'center' });

            this.doc.setFontSize(14);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(card.song_name, centerX, centerY + 20, {
                align: 'center',
                maxWidth: CARD_WIDTH - 10
            });
        });
    }

    private async drawBackPage(cards: CardData[]): Promise<void> {
        const { CARD_WIDTH, CARD_HEIGHT, PAGE_PADDING } = this;

        this.drawCutLines(cards.length < this.CARDS_PER_PAGE);

        for (let index = 0; index < cards.length; index++) {
            const card = cards[cards.length - 1 - index];

            const col = index % this.CARDS_PER_ROW;
            const row = Math.floor(index / this.CARDS_PER_ROW);

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

export function convertToCardData(tracks: any[]): CardData[] {
    return tracks.map(track => ({
        url: track.url,
        song_name: track.songName,
        artist: track.artist,
        year: track.releaseYear
    }));
}