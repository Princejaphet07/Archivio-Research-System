import React from 'react';
import { 
  FileText, 
  FileCheck2, 
  BarChart3, 
  Video, 
  BookOpen, 
  Link as LinkIcon, 
  PenTool, 
  File, 
  Code, 
  Database, 
  ClipboardCheck,
  Award
} from 'lucide-react';

export default function RequirementIcon({ icon, type, title, className = "w-5 h-5" }) {
  const t = (title || '').toLowerCase();
  const iconStr = String(icon || '');

  if (iconStr.includes('📄') || t.includes('manuscript') || t.includes('paper')) {
    return <FileText className={`${className} text-purple-600 dark:text-purple-400`} />;
  }
  if (iconStr.includes('📑') || iconStr.includes('📝') || t.includes('approval') || t.includes('sheet')) {
    return <FileCheck2 className={`${className} text-indigo-600 dark:text-indigo-400`} />;
  }
  if (iconStr.includes('📊') || iconStr.includes('💾') || t.includes('dataset') || t.includes('data')) {
    return <BarChart3 className={`${className} text-blue-600 dark:text-blue-400`} />;
  }
  if (iconStr.includes('🎥') || iconStr.includes('🎬') || iconStr.includes('📹') || t.includes('video') || t.includes('pitch')) {
    return <Video className={`${className} text-rose-600 dark:text-rose-400`} />;
  }
  if (iconStr.includes('📖') || iconStr.includes('📚') || t.includes('manual') || t.includes('guide')) {
    return <BookOpen className={`${className} text-amber-600 dark:text-amber-400`} />;
  }
  if (iconStr.includes('🔗') || type === 'url' || t.includes('url') || t.includes('link') || t.includes('github') || t.includes('repo')) {
    return <LinkIcon className={`${className} text-cyan-600 dark:text-cyan-400`} />;
  }
  if (iconStr.includes('✍️') || iconStr.includes('✍') || t.includes('signature') || t.includes('sign')) {
    return <PenTool className={`${className} text-orange-600 dark:text-orange-400`} />;
  }
  if (iconStr.includes('💻') || iconStr.includes('🖥️') || t.includes('code') || t.includes('source')) {
    return <Code className={`${className} text-emerald-600 dark:text-emerald-400`} />;
  }
  if (iconStr.includes('🗄️') || t.includes('database')) {
    return <Database className={`${className} text-teal-600 dark:text-teal-400`} />;
  }
  if (iconStr.includes('📋') || t.includes('checklist')) {
    return <ClipboardCheck className={`${className} text-stone-600 dark:text-stone-400`} />;
  }
  if (iconStr.includes('🏆') || t.includes('award') || t.includes('certificate')) {
    return <Award className={`${className} text-amber-500 dark:text-amber-400`} />;
  }

  // Fallback by type
  if (type === 'url') {
    return <LinkIcon className={`${className} text-cyan-600 dark:text-cyan-400`} />;
  }
  return <File className={`${className} text-purple-600 dark:text-purple-400`} />;
}
