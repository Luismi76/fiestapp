const puppeteer = require('puppeteer');
const path = require('path');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generatePDF() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Configurar viewport para formato presentación (16:9)
    await page.setViewport({ width: 1920, height: 1080 });

    // Cargar el HTML
    const htmlPath = path.join(__dirname, 'frontend', 'public', 'pitch-deck.html');
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // Esperar a que carguen las fuentes
    await sleep(2000);

    const totalSlides = 12;
    const slides = [];

    console.log('Generando PDF de la presentación...');

    for (let i = 0; i < totalSlides; i++) {
        // Navegar a la slide
        await page.evaluate((slideIndex) => {
            showSlide(slideIndex);
        }, i);

        // Esperar animaciones
        await sleep(800);

        // Capturar screenshot
        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 1080 }
        });

        slides.push(screenshot);
        console.log(`Slide ${i + 1}/${totalSlides} capturada`);
    }

    // Generar PDF directamente con cada slide como página
    const pdfPage = await browser.newPage();
    await pdfPage.setViewport({ width: 1920, height: 1080 });

    // Crear HTML con todas las imágenes
    const imagesHtml = slides.map((screenshot, index) => {
        const base64 = screenshot.toString('base64');
        return `<div class="slide-page"><img src="data:image/png;base64,${base64}" /></div>`;
    }).join('');

    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; }
                body { background: #000; }
                .slide-page {
                    width: 1920px;
                    height: 1080px;
                    page-break-after: always;
                    page-break-inside: avoid;
                }
                .slide-page:last-child {
                    page-break-after: avoid;
                }
                .slide-page img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                @media print {
                    .slide-page {
                        page-break-after: always;
                    }
                }
            </style>
        </head>
        <body>${imagesHtml}</body>
        </html>
    `;

    await pdfPage.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdfPath = path.join(__dirname, 'frontend', 'public', 'FiestApp-Presentacion.pdf');

    await pdfPage.pdf({
        path: pdfPath,
        width: '1920px',
        height: '1080px',
        printBackground: true,
        preferCSSPageSize: true
    });

    console.log(`\nPDF generado: ${pdfPath}`);

    await browser.close();
}

generatePDF().catch(console.error);
