import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ArchiveLogin from './pages/ArchiveLogin';
import ArchiveHome from './pages/ArchiveHome';
import ArchiveBrowse from './pages/ArchiveBrowse';
import ArchiveBookmarks from './pages/ArchiveBookmarks';
import ArchiveAbout from './pages/ArchiveAbout';
import ArchivePaperViewer from './pages/ArchivePaperViewer'; // <-- I-import kini!

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ArchiveHome />} />
        <Route path="/login" element={<ArchiveLogin />} />
        <Route path="/browse" element={<ArchiveBrowse />} />
        <Route path="/bookmarks" element={<ArchiveBookmarks />} />
        <Route path="/about" element={<ArchiveAbout />} />
        <Route path="/viewer" element={<ArchivePaperViewer />} /> {/* <-- Idugang kini */}
      </Routes>
    </Router>
  );
}

export default App;