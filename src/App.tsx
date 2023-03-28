import { useEffect, useRef, useState } from 'react';
import ResizeElement from "react-resize-element";

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import ArrowBack from '@mui/icons-material/ArrowBackIos';
import ArrowForward from '@mui/icons-material/ArrowForwardIos';
import Download from '@mui/icons-material/Download';

import * as pdfjs from "pdfjs-dist";
pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';

type Size = { width: number, height: number };

export default function App() {
  const outputScale = 4;

  const pdfRef = useRef<null | pdfjs.PDFDocumentProxy>(null);
  const canvasLeftRef = useRef<HTMLCanvasElement>(null);
  const canvasRightRef = useRef<HTMLCanvasElement>(null);

  const renderLeft = useRef<null | pdfjs.RenderTask>(null);
  const renderRight = useRef<null | pdfjs.RenderTask>(null);

  const title = getURLParam("title") || "PDF book";
  const file = getURLParam("file");
  const firstPageAlone = getURLParam("first") !== "";

  const [size, setSize] = useState<Size>({ width: 400, height: 200 });
  // const [pageStep, setPageStep] = useState(2);

  const [progress, setProgress] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [page, setPage] = useState(0);
  const [twoPages, setTwoPages] = useState(false);

  const numPages = pdfRef.current?.numPages || 0;

  // load pdf
  useEffect(() => {
    (async () => {
      if (pdfRef.current) pdfRef.current.destroy();
      pdfRef.current = null;
      setLoaded(false);
      setProgress(0);

      const getPdf = pdfjs.getDocument(file);

      getPdf.onProgress = ({ loaded, total }: { loaded: number, total: number }) => {
        const progress = loaded / total;
        setProgress(progress);
      };

      try {
        const pdf = await getPdf.promise;
        pdfRef.current = pdf;
        setLoaded(true);
      } catch (error: any) {
        setError(error.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  async function passTwoPages(pageNumber: number, actualSize: Size = size) {
    if (pageNumber < 0 || (pageNumber >= numPages - 1) || (firstPageAlone && pageNumber === 0)) {
      // first or last page
      return false;
    }

    if (!pdfRef.current) return false;
    const pdf = pdfRef.current;

    const firstPage = await pdf.getPage(pageNumber + 1);
    const firstViewport = firstPage.getViewport({ scale: 1 });
    const scale = actualSize.height / firstViewport.height;
    if (firstViewport.width * scale > actualSize.width)
      return false;

    const secondPage = await pdf.getPage(pageNumber + 2);
    const secondViewport = secondPage.getViewport({ scale: 1 });

    if ((firstViewport.width + secondViewport.width) * scale <= actualSize.width)
      return true;

    return false;
  }

  // render pdf
  useEffect(() => {
    (async () => {
      if (!pdfRef.current) return;
      const pdf = pdfRef.current;

      const pagePdf = await pdf.getPage(page + 1);
      const viewportScale1 = pagePdf.getViewport({ scale: 1 });
      const pageRatio = viewportScale1.width / viewportScale1.height;
      const sizeRatio = size.width / size.height;

      let scale = size.height / viewportScale1.height;
      if (pageRatio > sizeRatio) {
        scale = size.width / viewportScale1.width;
      }

      const viewport = pagePdf.getViewport({ scale });

      const canvas = canvasLeftRef.current;
      if (!canvas) throw new Error("Canvas not found");

      const canvasContext = canvas.getContext('2d') as CanvasRenderingContext2D;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";

      const transform = [outputScale, 0, 0, outputScale, 0, 0];

      if (renderLeft.current) renderLeft.current.cancel();
      const render = pagePdf.render({ canvasContext, viewport, transform });
      renderLeft.current = render;
      render.promise.catch(() => { });

      // second page
      if (twoPages) {
        const pageSecondPdf = await pdf.getPage(page + 2);
        const viewportSecond1 = pageSecondPdf.getViewport({ scale });
        const viewport = viewportSecond1;

        const canvas = canvasRightRef.current;
        if (!canvas) throw new Error("Canvas not found");

        const canvasContext = canvas.getContext('2d') as CanvasRenderingContext2D;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = [outputScale, 0, 0, outputScale, 0, 0];

        if (renderRight.current) renderRight.current.cancel();
        const render = pageSecondPdf.render({ canvasContext, viewport, transform });
        renderRight.current = render;
        render.promise.catch(() => { });
      }
    })();
  }, [loaded, size, page, firstPageAlone, numPages, twoPages]);

  useEffect(() => {
    (async () => {
      setTwoPages(await passTwoPages(page, size));
    })();
  }, [page, size]);

  function handleResize(size: Size) {
    setSize(size);
  }

  async function handlePage(move: number) {
    let nextPage = page + move;

    if (move > 0 && twoPages) {
      nextPage += 1;
    }
    if (move < 0) {
      if (await passTwoPages(nextPage - 1)) {
        nextPage -= 1;
      }
    }

    if (nextPage < 0) nextPage = 0;
    if (nextPage >= numPages) nextPage = page;

    setPage(nextPage);
    setTwoPages(await passTwoPages(nextPage));
  }

  return <Box display="flex" flexDirection="column" className="body">
    <Box component="header" bgcolor="background.paper">
      <h1>{title}</h1>
      <IconButton sx={{ position: "absolute", top: "4px", right: "12px" }} href={file} download size='large' color="primary">
        <Download />
      </IconButton>
    </Box>
    <Box display="flex" flexGrow={1} flexBasis={1} flexDirection="row" alignItems="stretch">
      <IconButton size='large' color="primary" onClick={() => handlePage(-1)}>
        <ArrowBack />
      </IconButton>

      <ResizeElement tag="section" style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", flexGrow: 1, flexBasis: "100px", overflow: "hidden" }} onResize={handleResize} >
        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          <canvas ref={canvasLeftRef} />
          <canvas ref={canvasRightRef} style={{ display: twoPages ? "block" : "none" }} />
        </Box>
        {/* <Document file={file} onLoadSuccess={handleLoad} onLoadProgress={handleProgress} onLoadError={handleError}  >
          {loaded === true && <>
            <Page pageIndex={page} height={pageHeight} devicePixelRatio={devicePixelRatio} />
            {!onePage && <Page pageIndex={page + 1} height={pageHeight} devicePixelRatio={devicePixelRatio} />}
          </>}
        </Document> */}
        {loaded === false && <Box display="flex" flexDirection="column" alignItems="stretch" textAlign="center">
          <Box>Načítání dokumentu...</Box>
          <LinearProgress variant="determinate" value={progress * 100} />
        </Box>}
        {error && <Box display="flex" flexDirection="column" alignItems="stretch" textAlign="center">
          <Box>Chyba při načítání dokumentu</Box>
          <LinearProgress variant="determinate" value={50} color="error" />
        </Box>}
      </ResizeElement>

      <IconButton size='large' color="primary" onClick={() => handlePage(1)}>
        <ArrowForward />
      </IconButton>
    </Box>
    <Box component="footer" bgcolor="background.paper">
      {!twoPages && <>Strana {page + 1} / {numPages}</>}
      {twoPages && <>
        Strany {page + 1} - {page + 2} / {numPages}
      </>}
    </Box>
  </Box>;
}

function getURLParam(param: string): string {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(param) || "";
}
