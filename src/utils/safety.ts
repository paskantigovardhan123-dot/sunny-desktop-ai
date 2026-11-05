/**
 * Safety validator and blocklist for Sunny Desktop Agent.
 * Hard-blocks destructive patterns even if the user attempts to approve them.
 */

export interface SafetyCheckResult {
  allowed: boolean;
  blocked: boolean;
  requiresConfirmation: boolean;
  reason?: string;
  category?: 'destructive' | 'system_tampering' | 'security_bypass' | 'read_only' | 'standard_write';
}

// Destructive patterns that are strictly forbidden under any circumstances
const HARD_BLOCKED_PATTERNS: Array<{ regex: RegExp; reason: string; category: SafetyCheckResult['category'] }> = [
  // Drive formatting
  {
    regex: /\bformat\s+([a-zA-Z]:|\/dev\/)/i,
    reason: 'Drive formatting commands are strictly hard-blocked to protect your files and OS.',
    category: 'destructive',
  },
  {
    regex: /\b(diskpart|fdisk|mkfs)\b/i,
    reason: 'Direct disk partitioning and disk wipes are strictly hard-blocked.',
    category: 'destructive',
  },
  // Root and drive root recursive deletion
  {
    regex: /\b(rm\s+(-rf|-fr|-r\s+-f|-f\s+-r)\s+(\/|(?:\/[a-zA-Z0-9_\-\.]+)+|\/\*|[a-zA-Z]:\\|\*))/i,
    reason: 'Recursive deletion targeting drive roots or root filesystem is hard-blocked.',
    category: 'destructive',
  },
  {
    regex: /\b(Remove-Item|rm|del|rmdir)\s+.*(-Recurse|-r|-s)\s+.*([a-zA-Z]:\\(\*|$)|\\windows|\\system32|\/\*|\/)/i,
    reason: 'Recursive deletion of system directories or drive roots is strictly hard-blocked.',
    category: 'destructive',
  },
  {
    regex: /\b(del|erase)\s+(\/f\s+)?(\/s\s+)?(\/q\s+)?([a-zA-Z]:\\|\/\*)/i,
    reason: 'Root-level recursive deletion commands are strictly hard-blocked.',
    category: 'destructive',
  },
  // Registry tampering & deletion
  {
    regex: /\b(reg(\.exe)?\s+delete|Remove-Item(Property)?\s+.*-(Path|LiteralPath)\s+.*(HKLM|HKEY_LOCAL_MACHINE|HKCR|HKEY_CLASSES_ROOT))/i,
    reason: 'System registry deletion commands are hard-blocked to protect system stability.',
    category: 'system_tampering',
  },
  // Disabling security tools & antivirus
  {
    regex: /(DisableRealtimeMonitoring|Set-MpPreference\s+.*-Disable|net\s+stop\s+(windefend|wscsvc|mpssvc)|sc\s+stop\s+(windefend|wscsvc|mpssvc)|Stop-Service\s+(windefend|wscsvc|mpssvc))/i,
    reason: 'Commands that disable Windows Defender, firewall, or security services are strictly hard-blocked.',
    category: 'security_bypass',
  },
  {
    regex: /netsh\s+advfirewall\s+set\s+allprofiles\s+state\s+off/i,
    reason: 'Disabling firewall profiles is strictly hard-blocked.',
    category: 'security_bypass',
  },
  // Malicious fork-bombs and raw disk clobber
  {
    regex: /:\(\)\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
    reason: 'Fork bombs and resource exhaustion commands are strictly hard-blocked.',
    category: 'destructive',
  },
];

// Sensitive system file write paths
const BLOCKED_WRITE_PATHS: Array<{ regex: RegExp; reason: string }> = [
  {
    regex: /^[a-zA-Z]:\\(windows|system32|recovery|boot)/i,
    reason: 'Writing directly into Windows system directories is hard-blocked.',
  },
  {
    regex: /^\/(etc|boot|sys|proc|root)/i,
    reason: 'Writing directly into root OS configuration directories is hard-blocked.',
  },
];

/**
 * Validates a PowerShell/terminal command against safety rules.
 */
export function validateCommandSafety(command: string): SafetyCheckResult {
  const trimmed = command.trim();
  if (!trimmed) {
    return {
      allowed: false,
      blocked: true,
      requiresConfirmation: false,
      reason: 'Empty command.',
    };
  }

  // Check hard blocked patterns
  for (const rule of HARD_BLOCKED_PATTERNS) {
    if (rule.regex.test(trimmed)) {
      return {
        allowed: false,
        blocked: true,
        requiresConfirmation: false,
        reason: rule.reason,
        category: rule.category,
      };
    }
  }

  // All valid commands require explicit user confirmation per the safety rules
  return {
    allowed: true,
    blocked: false,
    requiresConfirmation: true,
    reason: 'Command requires explicit user approval before execution.',
  };
}

/**
 * Validates a file write request against safety rules.
 */
export function validateWriteSafety(targetPath: string, _content?: string): SafetyCheckResult {
  const normalized = targetPath.trim().replace(/\//g, '\\');

  for (const rule of BLOCKED_WRITE_PATHS) {
    if (rule.regex.test(targetPath.trim()) || rule.regex.test(normalized)) {
      return {
        allowed: false,
        blocked: true,
        requiresConfirmation: false,
        reason: rule.reason,
        category: 'system_tampering',
      };
    }
  }

  // Writes to user files require explicit user confirmation
  return {
    allowed: true,
    blocked: false,
    requiresConfirmation: true,
    reason: 'File write requires explicit user approval before saving.',
    category: 'standard_write',
  };
}

/**
 * Checks if a tool is strictly read-only and can optionally be "always allowed"
 */
export function isReadOnlyTool(toolName: string): boolean {
  return ['read_file', 'list_dir', 'web_search', 'fetch_url', 'take_screenshot', 'set_reminder'].includes(toolName);
}
