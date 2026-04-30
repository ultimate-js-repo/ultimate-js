export type RemoteFunctionCalling = {
  type: "RemoteFunctionCalling";
  version: 1;
  args: unknown[];
  meta?: {
    requestId?: string;
    clientBuildId?: string;
  };
};

export type RemoteFunctionSuccess = {
  type: "RemoteFunctionResult";
  version: 1;
  ok: true;
  value: unknown;
};

export type RemoteFunctionFailure = {
  type: "RemoteFunctionResult";
  version: 1;
  ok: false;
  error: {
    name: string;
    message: string;
    statusCode?: number;
    code?: string;
    stack?: string;
  };
};

export type RemoteFunctionResult = RemoteFunctionSuccess | RemoteFunctionFailure;
