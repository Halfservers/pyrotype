/**
 * Test fixtures and factory functions for creating test data.
 */

export const ADMIN_USER = {
  user: 'admin',
  password: 'password',
  email: 'admin@pyrotype.local',
};

export const INVALID_CREDENTIALS = {
  user: 'admin',
  password: 'wrong-password',
};

export const NONEXISTENT_USER = {
  user: 'doesnotexist',
  password: 'password',
};

export const MALFORMED_INPUTS = {
  emptyBody: {},
  missingUser: { password: 'password' },
  missingPassword: { user: 'admin' },
  xssAttempt: { user: '<script>alert(1)</script>', password: 'password' },
  sqlInjection: { user: "admin' OR '1'='1", password: 'password' },
  oversizedInput: { user: 'a'.repeat(10000), password: 'b'.repeat(10000) },
  nullBytes: { user: 'admin\0', password: 'password\0' },
  unicodeOverflow: { user: '\u{10FFFF}'.repeat(1000), password: 'password' },
};

export const PATH_TRAVERSAL_ATTEMPTS = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32',
  '....//....//etc/passwd',
  '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '..%252f..%252f..%252fetc/passwd',
  '/proc/self/environ',
  'C:\\Windows\\System32\\config\\SAM',
];

export const VALID_UUID = 'afecbab4-44b2-457e-886e-1dc09067ab6f';
export const INVALID_UUID = 'not-a-valid-uuid';
export const RANDOM_UUID = '00000000-0000-0000-0000-000000000000';

export const PAGINATION = {
  default: { page: '1' },
  secondPage: { page: '2' },
  invalidPage: { page: '-1' },
  zeroPage: { page: '0' },
  stringPage: { page: 'abc' },
  hugePage: { page: '999999' },
};

export const POWER_ACTIONS = ['start', 'stop', 'restart', 'kill'] as const;
export const INVALID_POWER_ACTIONS = ['pause', 'hibernate', 'explode', ''] as const;

export function makeCreateUserPayload(overrides: Record<string, unknown> = {}) {
  return {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@pyrotype.local`,
    password: 'TestPassword123!',
    nameFirst: 'Test',
    nameLast: 'User',
    rootAdmin: false,
    ...overrides,
  };
}

export function makeCreateServerPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: `Test Server ${Date.now()}`,
    description: 'Automated test server',
    ownerId: 1,
    nodeId: 1,
    nestId: 1,
    eggId: 1,
    memory: 1024,
    disk: 10240,
    cpu: 100,
    io: 500,
    swap: 0,
    ...overrides,
  };
}

export function makeCreateNodePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: `Test Node ${Date.now()}`,
    fqdn: `test-node-${Date.now()}.pyrotype.local`,
    scheme: 'https',
    daemonBase: '/srv/daemon-data',
    daemonSftp: 2022,
    daemonListen: 8080,
    memory: 32768,
    disk: 1048576,
    memoryOverallocate: 0,
    diskOverallocate: 0,
    locationId: 1,
    ...overrides,
  };
}

export function makeCreateLocationPayload(overrides: Record<string, unknown> = {}) {
  return {
    short: `loc_${Date.now()}`,
    long: `Test Location ${Date.now()}`,
    ...overrides,
  };
}
