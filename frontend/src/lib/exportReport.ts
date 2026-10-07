/**
 * PNG / PDF export for the report sheet (ReportPrintTemplate).
 *
 * The PDF is A4 portrait. Pages break only between elements marked
 * `data-pdf-unit` ("row" = table row, "block" = section that must stay whole),
 * and the table header is repeated on every page that continues the list.
 */

const PAGE_W = 210; // mm, A4 portrait
const PAGE_H = 297;
const MARGIN = 10;
const FOOTER = 7; // mm reserved at the bottom of each page for the page number
const SCALE = 3; // ~350 dpi on A4, so Khmer text stays crisp when zoomed or printed

type Span = { top: number; bottom: number; left: number; right: number };
/** `head`: the table header to repeat at the top of this page, when it continues a table */
type Slice = { start: number; end: number; head: Span | null };

// Safari (iOS and macOS) returns a blank canvas above ~16.7M pixels; Chrome/Firefox/Edge allow far more
const IS_SAFARI =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || /^((?!chrome|chromium|crios|android|edg).)*safari/i.test(navigator.userAgent));
const MAX_CANVAS_AREA = IS_SAFARI ? 16_000_000 : 120_000_000;

// Only the faces the sheet uses, Khmer + Latin subsets, inlined as data URLs below
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400..700&family=Moul&display=block";
const FONT_SUBSETS = new Set(["khmer", "latin"]);
const FONT_TIMEOUT_MS = 15000;
const GSTATIC_URL = /https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g;

let fontCssPromise: Promise<string> | null = null;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Self-contained @font-face CSS for Kantumruy Pro + Moul, fonts inlined as data URLs. */
async function fetchSheetFontCss(): Promise<string> {
  const css = await (await fetch(FONT_CSS_URL)).text();
  // Google returns one "/* subset */ @font-face {...}" block per unicode subset
  const faces = css
    .split(/(?=\/\*\s*[\w-]+\s*\*\/)/)
    .filter((block) => FONT_SUBSETS.has(block.match(/\/\*\s*([\w-]+)\s*\*\//)?.[1] ?? ""))
    .join("\n");
  const urls = [...new Set(faces.match(GSTATIC_URL) ?? [])];
  if (!urls.length) throw new Error("No font files in Google Fonts response");
  const inlined = new Map(
    await Promise.all(
      urls.map(async (url) => [url, await blobToDataUrl(await (await fetch(url)).blob())] as const)
    )
  );
  return faces.replace(GSTATIC_URL, (url) => inlined.get(url) ?? url);
}

/**
 * Make sure the sheet is laid out with the same fonts that get embedded in the image.
 * html-to-image copies each element's computed size, so if the snapshot fell back to a different
 * (taller) font than the live page, Khmer text would spill over the table lines.
 */
async function prepareFonts(): Promise<string> {
  let css = "";
  try {
    fontCssPromise ??= Promise.race([
      fetchSheetFontCss(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Font download timeout")), FONT_TIMEOUT_MS)
      ),
    ]);
    css = await fontCssPromise;
    if (!document.getElementById("report-fonts")) {
      const style = document.createElement("style");
      style.id = "report-fonts";
      style.textContent = css;
      document.head.appendChild(style);
    }
  } catch (err) {
    fontCssPromise = null; // retry on the next export
    console.warn("Could not download report fonts; exporting with system fonts:", err);
  }

  // Sample text must include Khmer, or the unicode-range'd Khmer face is never loaded
  const sample = "ក្រុមហ៊ុន Bonchi $1";
  await Promise.all([
    document.fonts.load(`400 16px "Kantumruy Pro"`, sample),
    document.fonts.load(`600 16px "Kantumruy Pro"`, sample),
    document.fonts.load(`700 16px "Kantumruy Pro"`, sample),
    document.fonts.load(`400 16px "Moul"`, sample),
  ]).catch(() => undefined);
  await document.fonts.ready;
  // Let the sheet re-flow with the new fonts before it is measured. (Not requestAnimationFrame:
  // it never fires while the tab is in the background, which would hang the export.)
  await new Promise((resolve) => setTimeout(resolve, 50));
  return css;
}

async function renderWithHtml2CanvasPro(
  el: HTMLElement,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas-pro")).default;
  return html2canvas(el, {
    scale: SCALE,
    useCORS: true,
    logging: false,
    backgroundColor: "#FFFFFF",
    width,
    height,
    windowWidth: width,
    windowHeight: Math.max(height, typeof window !== "undefined" ? window.innerHeight : height),
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
    onclone: (clonedDoc) => {
      const clonedEl = clonedDoc.getElementById("dc-root");
      if (clonedEl && clonedEl.parentElement) {
        clonedEl.parentElement.style.position = "static";
        clonedEl.parentElement.style.zIndex = "1";
        clonedEl.parentElement.style.opacity = "1";
      }
    },
  });
}

async function renderCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  const fontEmbedCSS = await prepareFonts();

  const width = el.offsetWidth || el.scrollWidth || 880;
  const height = el.offsetHeight || el.scrollHeight;

  // 1. html-to-image: the browser itself lays out and shapes the Khmer text
  try {
    const { toCanvas } = await import("html-to-image");
    const options = {
      width,
      height,
      pixelRatio: Math.min(SCALE, Math.sqrt(MAX_CANVAS_AREA / (width * height))),
      backgroundColor: "#FFFFFF",
      // Never let html-to-image crawl the page's stylesheets for fonts (slow, and fails on CORS)
      ...(fontEmbedCSS ? { fontEmbedCSS } : { skipFonts: true }),
    };
    // Safari sometimes paints the first pass before embedded fonts are decoded; the second pass is reliable.
    // Other browsers get it right the first time, and each pass costs seconds on a long report.
    if (IS_SAFARI) await toCanvas(el, options);
    return await toCanvas(el, options);
  } catch (err) {
    console.warn("html-to-image failed, falling back to html2canvas-pro:", err);
  }

  // 2. Fallback to html2canvas-pro (native support for Tailwind v4 modern oklch/lab colors)
  return renderWithHtml2CanvasPro(el, width, height);
}

/** Split the sheet (CSS px, relative to its top) into page slices of at most `capacity` px. */
function planPages(el: HTMLElement, capacity: number) {
  const rootTop = el.getBoundingClientRect().top;
  const rootLeft = el.getBoundingClientRect().left;
  const rel = (n: Element): Span => {
    const r = n.getBoundingClientRect();
    return { top: r.top - rootTop, bottom: r.bottom - rootTop, left: r.left - rootLeft, right: r.right - rootLeft };
  };

  // Each table marked data-pdf-repeat-head repeats its own header when it continues on a new page
  const headOf = new Map<Element, Span>();
  const headFor = (n: Element): Span | null => {
    const table = n.closest("table[data-pdf-repeat-head]");
    const thead = table?.querySelector(":scope > thead");
    if (!table || !thead) return null;
    if (!headOf.has(table)) headOf.set(table, rel(thead));
    return headOf.get(table)!;
  };

  const units = Array.from(el.querySelectorAll<HTMLElement>("[data-pdf-unit]")).map((n) => ({
    ...rel(n),
    head: n.dataset.pdfUnit === "row" ? headFor(n) : null,
    keepNext: n.hasAttribute("data-pdf-keep-next"),
  }));

  const height = (h: Span | null) => (h ? h.bottom - h.top : 0);
  const slices: Slice[] = [];
  let start = 0;
  let head: Span | null = null;
  units.forEach((u, i) => {
    // A shop heading must land on the same page as its first line
    const bottom = u.keepNext && units[i + 1] ? units[i + 1].bottom : u.bottom;
    const used = height(head) + (bottom - start);
    if (used > capacity && u.top > start) {
      slices.push({ start, end: u.top, head });
      start = u.top;
      head = u.head;
    }
  });
  // Every unit fits by construction; clamp so the sheet's bottom padding can't overflow (and shrink) the last page
  const end = Math.min(el.getBoundingClientRect().height, start + capacity - height(head));
  slices.push({ start, end, head });
  return slices;
}

function download(href: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = href;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadReportImage(el: HTMLElement, fileName: string) {
  const canvas = await renderCanvas(el);

  // Use toBlob for memory-efficient and reliable download without dataURL length limits
  await new Promise<void>((resolve, reject) => {
    try {
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) {
            download(canvas.toDataURL("image/png"), fileName);
            resolve();
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = fileName;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          resolve();
        }, "image/png");
      } else {
        download(canvas.toDataURL("image/png"), fileName);
        resolve();
      }
    } catch (e) {
      reject(e);
    }
  });
}

export async function downloadReportPdf(el: HTMLElement, fileName: string, footerLabel: string) {
  const canvas = await renderCanvas(el);
  const { jsPDF } = await import("jspdf");

  const cssWidth = el.getBoundingClientRect().width;
  const scale = canvas.width / cssWidth;
  const contentW = PAGE_W - MARGIN * 2;
  const contentH = PAGE_H - MARGIN * 2;
  const pxPerMm = cssWidth / contentW; // CSS px per mm on paper
  const capacity = (contentH - FOOTER) * pxPerMm;

  const slices = planPages(el, capacity);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = canvas.width;
  const pageH = Math.round(contentH * pxPerMm * scale);
  const capPx = capacity * scale;

  slices.forEach((s, i) => {
    const page = document.createElement("canvas");
    page.width = pageW;
    page.height = pageH;
    const ctx = page.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, pageW, pageH);

    const headTop = s.head ? Math.round(s.head.top * scale) : 0;
    const headPx = s.head ? Math.round((s.head.bottom - s.head.top) * scale) : 0;
    const bodyTop = Math.round(s.start * scale);
    const bodyPx = Math.round(s.end * scale) - bodyTop;
    // Only shrinks if a single unbreakable block is taller than a page
    const fit = Math.min(1, capPx / (headPx + bodyPx));
    const drawW = pageW * fit;
    const x = (pageW - drawW) / 2;

    let y = 0;
    if (headPx > 0) {
      ctx.drawImage(canvas, 0, headTop, pageW, headPx, x, y, drawW, headPx * fit);
      y += headPx * fit;
    }
    ctx.drawImage(canvas, 0, bodyTop, pageW, bodyPx, x, y, drawW, bodyPx * fit);

    // The list continues on the next page: close this page's table with the dark frame line
    const nextHead = slices[i + 1]?.head;
    if (nextHead) {
      const left = x + nextHead.left * scale * fit;
      const right = x + nextHead.right * scale * fit;
      const bottomY = y + bodyPx * fit;
      ctx.fillStyle = "#334155";
      ctx.fillRect(left, bottomY - scale, right - left, scale);
    }

    // Footer: report name on the left, page number on the right
    const side = 26 * scale;
    const baseline = pageH - 2 * pxPerMm * scale;
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = scale;
    ctx.beginPath();
    ctx.moveTo(side, baseline - 16 * scale);
    ctx.lineTo(pageW - side, baseline - 16 * scale);
    ctx.stroke();
    ctx.fillStyle = "#64748B";
    ctx.font = `500 ${12 * scale}px "Kantumruy Pro", "Noto Sans Khmer", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(footerLabel, side, baseline);
    ctx.textAlign = "right";
    ctx.fillText(`ទំព័រ ${i + 1} / ${slices.length}`, pageW - side, baseline);

    if (i > 0) pdf.addPage();
    pdf.addImage(page.toDataURL("image/png"), "PNG", MARGIN, MARGIN, contentW, contentH, undefined, "FAST");
  });

  pdf.save(fileName);
}

/** Load the report fonts (Kantumruy Pro + Moul) into the page, so on-screen previews match the export */
export async function loadReportFonts() {
  await prepareFonts();
}
