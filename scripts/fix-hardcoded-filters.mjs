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
      
      const patterns = [
        // Remove created_by hardcodes
        /\.eq\(\s*["']created_by["']\s*,\s*user!\.id\s*\)/g,
        /\.eq\(\s*["']created_by["']\s*,\s*user\.id\s*\)/g,
        
        // Remove trainer_id hardcodes for standard queries
        /\.eq\(\s*["']trainer_id["']\s*,\s*user!\.id\s*\)/g,
        /\.eq\(\s*["']trainer_id["']\s*,\s*user\.id\s*\)/g,
      ];

      for (const p of patterns) {
        if (p.test(content)) {
          content = content.replace(p, '');
          changed = true;
        }
      }

      // Special cases for RPC calls where p_trainer_id is hardcoded
      // In RPC calls, we're passing `p_trainer_id: user.id`. This is harder
      // because RPCs don't use the Box ID by default, they expect the trainer ID.
      // E.g. supabase.rpc("get_available_slots", { p_trainer_id: user.id })
      // For now, let's let those be unless the user complains, or we see an issue.
      // Actually, if an RPC needs trainer_id, it will fail if it gives the professor's ID.
      // So let's see which RPCs take p_trainer_id.
      
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  });
}

walkAndReplace('./src/app/entrenador');
walkAndReplace('./src/components');
