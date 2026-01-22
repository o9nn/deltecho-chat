import type { Atom } from "../atomspace/atom.js"; from "../atomspace/atom.js";

export type RequestType = "QUERY" | "VALIDATE" | "SYNC";

export interface FederationRequest {
  requestId: string;
  senderId: string;
  type: RequestType;
  payload: any;
  timestamp: number;
}

export interface FederationResponse {
  requestId: string;
  responderId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface ConsensusVote {
  atomId: string;
  voterId: string;
  confidence: number;
  approved: boolean;
}

export class FederationProtocol {
  public static createQueryRequest(
    senderId: string,
    query: any,
  ): FederationRequest {
    return {
      requestId: crypto.randomUUID(),
      senderId,
      type: "QUERY",
      payload: query,
      timestamp: Date.now(),
    };
  }

  public static createResponse(
    request: FederationRequest,
    responderId: string,
    data: any,
    success: boolean = true,
  ): FederationResponse {
    return {
      requestId: request.requestId,
      responderId,
      success,
      data,
      timestamp: Date.now(),
    };
  }
}
