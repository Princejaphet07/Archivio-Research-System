const fs = require('fs');
const files = [
  'src/adviser/pages/Login.jsx',
  'src/adviser/pages/SignUp.jsx',
  'src/adviser/pages/ForgotPassword.jsx',
  'src/adviser/pages/ActivateAccount.jsx'
];
for(const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Remove dark mode classes (e.g. dark:bg-stone-900)
    content = content.replace(/\s?dark:[^\s\"\'\`]+/g, '');
    fs.writeFileSync(file, content);
    console.log('Processed ' + file);
  }
}
