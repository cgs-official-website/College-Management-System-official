const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/pages/superadmin/SuperColleges.jsx',
  'src/pages/admin/timetable/Timetable.jsx',
  'src/pages/admin/students/StudentList.jsx',
  'src/pages/admin/notices/NoticeBoard.jsx',
  'src/pages/admin/library/Library.jsx',
  'src/pages/admin/infrastructure/Infrastructure.jsx',
  'src/pages/admin/hr/HRManagement.jsx',
  'src/pages/admin/fees/Fees.jsx',
  'src/pages/admin/exams/Exams.jsx',
  'src/pages/admin/courses/CoursesList.jsx',
  'src/pages/admin/admission/Admission.jsx'
];

filesToUpdate.forEach(file => {
  const absolutePath = path.join(__dirname, file);
  if (!fs.existsSync(absolutePath)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(absolutePath, 'utf8');

  // Skip if already updated
  if (content.includes('useConfirm')) {
    console.log(`Already updated: ${file}`);
    return;
  }

  // 1. Add import statement
  // Determine relative path depth
  const depth = file.split('/').length - 2; // e.g. src/pages/admin/exams/Exams.jsx -> depth 3
  const relativePrefix = '../'.repeat(depth);
  const importStatement = `import { useConfirm } from '${relativePrefix}contexts/ConfirmContext';\n`;

  // Insert import after the last import statement
  const importMatch = content.match(/^import.*?;?\n/gm);
  if (importMatch) {
    const lastImportIndex = content.lastIndexOf(importMatch[importMatch.length - 1]);
    const insertPosition = lastImportIndex + importMatch[importMatch.length - 1].length;
    content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
  }

  // 2. Add `const confirm = useConfirm();` inside the component
  // Find the component definition: `const ComponentName = () => {`
  const componentMatch = content.match(/const\s+[A-Z]\w+\s*=\s*\([^)]*\)\s*=>\s*\{/);
  if (componentMatch) {
    const insertPosition = componentMatch.index + componentMatch[0].length;
    content = content.slice(0, insertPosition) + '\n  const confirm = useConfirm();' + content.slice(insertPosition);
  } else {
    const defaultExportMatch = content.match(/export\s+default\s+function\s+[A-Z]\w+\s*\([^)]*\)\s*\{/);
    if (defaultExportMatch) {
      const insertPosition = defaultExportMatch.index + defaultExportMatch[0].length;
      content = content.slice(0, insertPosition) + '\n  const confirm = useConfirm();' + content.slice(insertPosition);
    }
  }

  // 3. Replace window.confirm
  // Handle `if (!window.confirm("..."))`
  content = content.replace(/if\s*\(\!window\.confirm\((['"`])(.*?)(['"`])\)\)/g, 'if (!(await confirm({ message: $1$2$3 })))');
  // Handle `if (window.confirm("..."))`
  content = content.replace(/if\s*\(window\.confirm\((['"`])(.*?)(['"`])\)\)/g, 'if (await confirm({ message: $1$2$3 }))');

  fs.writeFileSync(absolutePath, content, 'utf8');
  console.log(`Updated: ${file}`);
});
