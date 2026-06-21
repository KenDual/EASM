const PRIVATE_IP_RE = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
];

export function isPrivateIP(ip) {
    if (ip === 'localhost' || ip === '::1') return true;
    return PRIVATE_IP_RE.some((re) => re.test(ip));
}
