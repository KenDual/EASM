import { ErrInvalid } from '../utils/errors.js';

export function validate(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const err = new ErrInvalid('Validation failed');
            err.details = result.error.flatten();
            return next(err);
        }
        req.body = result.data;
        next();
    };
}
