/** Request envelope sent by the client when invoking a remote function. */
export type RemoteFunctionCalling = {
  /** Discriminator for remote function invocation requests. */
  type: "RemoteFunctionCalling";
  /** Protocol version understood by the client and server. */
  version: 1;
  /** Positional arguments passed to the remote function. */
  args: unknown[];
  /** Optional request metadata used for tracing and build coordination. */
  meta?: {
    /** Stable request identifier for correlating logs across processes. */
    requestId?: string;
    /** Client build identifier used to detect mismatched generated assets. */
    clientBuildId?: string;
  };
};

/** Successful response envelope returned after a remote function resolves. */
export type RemoteFunctionSuccess = {
  /** Discriminator for all remote function result envelopes. */
  type: "RemoteFunctionResult";
  /** Protocol version used to encode the result. */
  version: 1;
  /** Indicates that the remote function completed successfully. */
  ok: true;
  /** Serialized return value from the remote function. */
  value: unknown;
};

/** Failed response envelope returned when a remote function throws. */
export type RemoteFunctionFailure = {
  /** Discriminator for all remote function result envelopes. */
  type: "RemoteFunctionResult";
  /** Protocol version used to encode the result. */
  version: 1;
  /** Indicates that the remote function failed. */
  ok: false;
  /** Serialized error details safe to send over the protocol boundary. */
  error: {
    /** Error class or fallback error name. */
    name: string;
    /** Human-readable error message. */
    message: string;
    /** Optional HTTP status code associated with the error. */
    statusCode?: number;
    /** Optional machine-readable application error code. */
    code?: string;
    /** Optional stack trace, typically included only in development. */
    stack?: string;
  };
};

/** Remote function response envelope for both success and failure outcomes. */
export type RemoteFunctionResult =
  | RemoteFunctionSuccess
  | RemoteFunctionFailure;
