import fs from 'fs';
import path from 'path';

function walkAndReplace(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      walkAndReplace(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      
      // Replace variations of .eq("created_by", user.id)
      const patterns = [
        /\.eq\(\s*["']created_by["']\s*,\s*user!\.id\s*\)/g,
        /\.eq\(\s*["']created_by["']\s*,\s*user\.id\s*\)/g
      ];

      for (const p of patterns) {
        if (p.test(content)) {
          content = content.replace(p, '');
          changed = true;
        }
      }

      // Also replace trainer_id filters for payments and metrics where we want box-wide?
      // For now, let's just do created_by to fix the student lists!
      
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  });
}

walkAndReplace('./src/app/entrenador');
walkAndReplace('./src/components');
