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

/** Placeholder sent in request args when a client passes a callback function. */
export type RemoteFunctionCallbackRef = {
  /** Marker used to distinguish callback refs from user data. */
  __ultimate_rpc_callback: true;
  /** Opaque callback identifier scoped to one RPC call. */
  id: string;
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

/** Serialized error details used by RPC and streaming protocol envelopes. */
export type RemoteFunctionError = RemoteFunctionFailure["error"];

/** SSE message carrying one queued RPC result and its opaque resume cursor. */
export type RemoteFunctionSseMessage = {
  /** Discriminator for queued SSE payload messages. */
  type: "message";
  /** Opaque UUID cursor assigned by the server. */
  cursor: string;
  /** RPC result carried by this queued message. */
  result: RemoteFunctionResult;
};

/** SSE message instructing the client to invoke a callback argument. */
export type RemoteFunctionSseCallback = {
  /** Discriminator for queued callback invocations. */
  type: "callback";
  /** Opaque UUID cursor assigned by the server. */
  cursor: string;
  /** Callback identifier originally sent by the client. */
  callbackId: string;
  /** Serialized arguments passed by the server to the callback. */
  args: unknown[];
};

/** SSE marker emitted when there are no queued messages left to send. */
export type RemoteFunctionSseEnd = {
  /** Discriminator for the terminal queue marker. */
  type: "end";
  /** Optional latest cursor known to the server. */
  cursor?: string;
};

/** SSE protocol-level error. User function failures use RemoteFunctionResult. */
export type RemoteFunctionSseError = {
  /** Discriminator for stream/protocol errors. */
  type: "error";
  /** Optional latest cursor known to the server. */
  cursor?: string;
  /** Serialized protocol error details. */
  error: RemoteFunctionError;
};

/** Payloads emitted by the RPC SSE transport. */
export type RemoteFunctionSseEvent =
  | RemoteFunctionSseMessage
  | RemoteFunctionSseCallback
  | RemoteFunctionSseEnd
  | RemoteFunctionSseError;
