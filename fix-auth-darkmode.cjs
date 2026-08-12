const fs = require('fs');
const path = require('path');

const filesToProcess = [
  path.join(__dirname, 'src', 'student', 'pages', 'StudentSignup.jsx'),
  path.join(__dirname, 'src', 'student', 'pages', 'StudentForgotPassword.jsx'),
  path.join(__dirname, 'src', 'student', 'pages', 'StudentActivate.jsx')
];

for (const file of filesToProcess) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Container background
    content = content.replace(/className="([^"]*)bg-cover bg-center([^"]*)"/g, (match, p1, p2) => {
      if (match.includes('dark:bg-stone-950')) return match;
      return `className="${p1}bg-cover bg-center dark:!bg-none dark:bg-stone-950 transition-colors duration-300${p2}"`;
    });

    // Card background
    content = content.replace(/bg-\\[#fdfaf4\\]/g, 'bg-[#fdfaf4] dark:bg-stone-900 transition-colors');
    
    // Inputs background
    content = content.replace(/bg-\\[#faf6f0\\]/g, 'bg-[#faf6f0] dark:bg-stone-800');

    // Borders
    content = content.replace(/border-\\[#ddd5c8\\]/g, 'border-[#ddd5c8] dark:border-stone-700');
    content = content.replace(/border-\\[#d5c9bb\\]/g, 'border-[#d5c9bb] dark:border-stone-700');

    // Text colors
    content = content.replace(/text-\\[#2A1115\\]/g, 'text-[#2A1115] dark:text-stone-100');
    content = content.replace(/text-gray-500/g, 'text-gray-500 dark:text-stone-400');
    content = content.replace(/text-\\[#1a1a1a\\]/g, 'text-[#1a1a1a] dark:text-stone-100');
    
    // Primary color update for dark mode coherence
    content = content.replace(/bg-\\[#6B0F1A\\]/g, 'bg-[#6B0F1A] dark:bg-[#7B1F35]');
    content = content.replace(/hover:bg-\\[#540c14\\]/g, 'hover:bg-[#540c14] dark:hover:bg-[#5a1831]');
    content = content.replace(/text-\\[#6B0F1A\\]/g, 'text-[#6B0F1A] dark:text-[#E87388]');
    content = content.replace(/border-\\[#6B0F1A\\]/g, 'border-[#6B0F1A] dark:border-[#7B1F35]');

    fs.writeFileSync(file, content);
    console.log(`Processed ${path.basename(file)}`);
  } else {
    console.log(`File not found: ${path.basename(file)}`);
  }
}
