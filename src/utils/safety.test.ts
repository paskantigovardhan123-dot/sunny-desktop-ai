import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCommandSafety, validateWriteSafety, isReadOnlyTool } from './safety.js';

test('Hard blocks disk format commands', () => {
  const res1 = validateCommandSafety('format C: /fs:NTFS');
  assert.equal(res1.blocked, true);
  assert.equal(res1.category, 'destructive');

  const res2 = validateCommandSafety('format d:');
  assert.equal(res2.blocked, true);
});

test('Hard blocks root recursive deletion commands', () => {
  const rmRoot = validateCommandSafety('rm -rf /');
  assert.equal(rmRoot.blocked, true);

  const psRoot = validateCommandSafety('Remove-Item -Recurse -Force C:\\*');
  assert.equal(psRoot.blocked, true);

  const delRoot = validateCommandSafety('del /f /s /q C:\\');
  assert.equal(delRoot.blocked, true);
});

test('Hard blocks registry delete commands', () => {
  const regDel = validateCommandSafety('reg delete HKLM\\Software\\Microsoft /f');
  assert.equal(regDel.blocked, true);
  assert.equal(regDel.category, 'system_tampering');

  const psReg = validateCommandSafety('Remove-Item -Path "HKLM:\\System\\CurrentControlSet" -Recurse');
  assert.equal(psReg.blocked, true);
});

test('Hard blocks disabling security tools and antivirus', () => {
  const def = validateCommandSafety('Set-MpPreference -DisableRealtimeMonitoring $true');
  assert.equal(def.blocked, true);
  assert.equal(def.category, 'security_bypass');

  const stopDef = validateCommandSafety('net stop WinDefend');
  assert.equal(stopDef.blocked, true);

  const fwOff = validateCommandSafety('netsh advfirewall set allprofiles state off');
  assert.equal(fwOff.blocked, true);
});

test('Requires confirmation for safe standard commands', () => {
  const safeCmd = validateCommandSafety('Get-Process | Select-Object -First 5');
  assert.equal(safeCmd.blocked, false);
  assert.equal(safeCmd.allowed, true);
  assert.equal(safeCmd.requiresConfirmation, true);

  const dirCmd = validateCommandSafety('dir C:\\Users\\Desktop');
  assert.equal(dirCmd.blocked, false);
  assert.equal(dirCmd.requiresConfirmation, true);
});

test('Hard blocks writes to system32 and windows root', () => {
  const sysWrite = validateWriteSafety('C:\\Windows\\System32\\drivers\\etc\\hosts');
  assert.equal(sysWrite.blocked, true);

  const safeWrite = validateWriteSafety('C:\\Users\\Sunny\\Documents\\notes.txt');
  assert.equal(safeWrite.blocked, false);
  assert.equal(safeWrite.requiresConfirmation, true);
});

test('Distinguishes read-only tools from mutation tools', () => {
  assert.equal(isReadOnlyTool('read_file'), true);
  assert.equal(isReadOnlyTool('list_dir'), true);
  assert.equal(isReadOnlyTool('web_search'), true);
  assert.equal(isReadOnlyTool('run_command'), false);
  assert.equal(isReadOnlyTool('write_file'), false);
});
