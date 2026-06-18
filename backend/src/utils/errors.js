export class ErrNotFound extends Error {
  constructor(message = 'not found') {
    super(message);
    this.name = 'ErrNotFound';
    this.code = 'NOT_FOUND';
    this.status = 404;
  }
}

export class ErrInvalid extends Error {
  constructor(message = 'invalid request') {
    super(message);
    this.name = 'ErrInvalid';
    this.code = 'INVALID_REQUEST';
    this.status = 400;
  }
}

export class ErrConflict extends Error {
  constructor(message = 'conflict') {
    super(message);
    this.name = 'ErrConflict';
    this.code = 'CONFLICT';
    this.status = 409;
  }
}
