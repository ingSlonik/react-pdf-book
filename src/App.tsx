import { useState } from 'react';
import { Document, Page } from 'react-pdf';
import ResizeElement from "react-resize-element";

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import ArrowBack from '@mui/icons-material/ArrowBackIos';
import ArrowForward from '@mui/icons-material/ArrowForwardIos';
import Download from '@mui/icons-material/Download';

type Size = { width: number, height: number };

export default function App() {
  const devicePixelRatio = 5;

  const title = getURLParam("title") || "PDF book";
  const file = getURLParam("file");
  const firstPageAlone = getURLParam("first") !== "";

  const [pageHeight, setPageHeight] = useState(300);
  const [pageStep, setPageStep] = useState(2);

  const [loading, setLoading] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean | string>(false);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(0);

  const onePage = pageStep === 1 || (firstPageAlone && page === 0) || (page >= numPages - 1);

  function handleResize(size: Size) {
    const ratioA4 = 1.414;

    let pageRatio = 2 / ratioA4;
    if (size.width / size.height > pageRatio) {
      setPageStep(2);
    } else {
      pageRatio = 1 / ratioA4;
      setPageStep(1);
    }

    if (size.width / size.height > pageRatio) {
      setPageHeight(size.height);
    } else {
      setPageHeight(size.width / pageRatio)
    }
  }

  function handlePage(move: number) {
    let nextPage = firstPageAlone && page === 0 && move > 0 ? 1 :
      page + move * pageStep;
    if (nextPage < 0) nextPage = 0;
    if (nextPage >= numPages) nextPage = page;

    setPage(nextPage);
  }

  function handleProgress({ loaded, total }: { loaded: number, total: number }) {
    const progress = loaded / total;
    setLoading(progress);
  }
  function handleLoad({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoaded(true);
  }
  function handleError(error: Error) {
    setLoaded(error.message);
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

      <ResizeElement tag="section" style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, flexBasis: "100px", overflow: "hidden" }} onResize={handleResize} >
        <Document file={file} onLoadSuccess={handleLoad} onLoadProgress={handleProgress} onLoadError={handleError}  >
          {loaded === true && <>
            <Page pageIndex={page} height={pageHeight} devicePixelRatio={devicePixelRatio} />
            {!onePage && <Page pageIndex={page + 1} height={pageHeight} devicePixelRatio={devicePixelRatio} />}
          </>}
        </Document>
        {loaded === false && <Box display="flex" flexDirection="column" alignItems="stretch" textAlign="center">
          <Box>Načítání dokumentu...</Box>
          <LinearProgress variant="determinate" value={loading * 100} />
        </Box>}
        {typeof loaded === "string" && <Box display="flex" flexDirection="column" alignItems="stretch" textAlign="center">
          <Box>Chyba při načítání dokumentu</Box>
          <LinearProgress variant="determinate" value={50} color="error" />
        </Box>}
      </ResizeElement>

      <IconButton size='large' color="primary" onClick={() => handlePage(1)}>
        <ArrowForward />
      </IconButton>
    </Box>
    <Box component="footer" bgcolor="background.paper">
      {onePage && <>Strana {page + 1} / {numPages}</>}
      {!onePage && <>
        Strany {page + 1} - {page + pageStep} / {numPages}
      </>}
    </Box>
  </Box>;
}

function getURLParam(param: string): string {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(param) || "";
}
