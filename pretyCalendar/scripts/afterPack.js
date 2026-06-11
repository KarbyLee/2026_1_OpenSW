const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const projectDir = context.packager.projectDir;
  const rcedit = path.join(projectDir, 'scripts', 'tools', 'rcedit.exe');
  const executable = path.join(context.appOutDir, 'Pretty Calendar.exe');
  const icon = path.join(projectDir, 'Images', 'pretty-calendar-icon.ico');
  const args = [
    executable,
    '--set-icon',
    icon,
    '--set-version-string',
    'FileDescription',
    'Pretty Calendar',
    '--set-version-string',
    'ProductName',
    'Pretty Calendar',
  ];

  execFileSync(rcedit, args, { stdio: 'inherit' });
};
