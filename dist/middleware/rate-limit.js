export function createRateLimiter({ windowMs, max }) {
    const requests = new Map();
    return (request, response, next) => {
        const now = Date.now();
        const key = request.ip || request.socket.remoteAddress || 'unknown';
        const current = requests.get(key);
        const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
        bucket.count += 1;
        requests.set(key, bucket);
        if (bucket.count > max) {
            response.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
            return response.status(429).json({ error: 'Too many requests. Please retry later.' });
        }
        return next();
    };
}
