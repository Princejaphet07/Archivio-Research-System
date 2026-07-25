import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ArchiveLogin from './pages/ArchiveLogin';
import ArchiveHome from './pages/ArchiveHome';
import ArchiveBrowse from './pages/ArchiveBrowse';
import ArchiveBookmarks from './pages/ArchiveBookmarks';
import ArchiveAbout from './pages/ArchiveAbout';
import ArchivePaperViewer from './pages/ArchivePaperViewer';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ArchiveHome />} />
          <Route path="/login" element={<ArchiveLogin />} />
          <Route path="/browse" element={<ArchiveBrowse />} />
          <Route path="/about" element={<ArchiveAbout />} />
          
          {/* Protected Routes */}
          <Route path="/bookmarks" element={
            <ProtectedRoute>
              <ArchiveBookmarks />
            </ProtectedRoute>
          } />
          
          <Route path="/viewer/:id" element={
            <ProtectedRoute>
              <ArchivePaperViewer />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;