import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtTokenVerifier } from '../web/shared/auth/jwt-token-verifier';

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: '*',
  },
})
export class StationsGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtTokenVerifier: JwtTokenVerifier) {}

  @SubscribeMessage('map.join')
  handleMapJoin(@ConnectedSocket() client: Socket) {
    client.join('map');
    return { joined: 'map' };
  }

  @SubscribeMessage('admin.join')
  handleAdminJoin(@ConnectedSocket() client: Socket) {
    const rawToken = this.extractToken(client);
    if (!rawToken) {
      return { error: 'Missing token' };
    }

    try {
      const user = this.jwtTokenVerifier.verify(rawToken);
      if (!user.isAdmin()) {
        return { error: 'Admin role required' };
      }
      client.join('admin');
      return { joined: 'admin' };
    } catch {
      return { error: 'Invalid token' };
    }
  }

  @SubscribeMessage('station.join')
  handleStationJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { stationId: string },
  ) {
    client.join(`station:${payload.stationId}`);
    return { joined: `station:${payload.stationId}` };
  }

  @SubscribeMessage('session.join')
  handleSessionJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    client.join(`session:${payload.sessionId}`);
    return { joined: `session:${payload.sessionId}` };
  }

  emitStationStateChanged(
    publicPayload: { stationId?: string } & Record<string, unknown>,
    adminPayload?: { stationId?: string } & Record<string, unknown>,
  ) {
    this.server.to('map').emit('station.state.changed', publicPayload);
    if (adminPayload) {
      this.server.to('admin').emit('station.state.changed', adminPayload);
    }
    if (publicPayload.stationId) {
      this.server
        .to(`station:${String(publicPayload.stationId)}`)
        .emit('station.state.changed', publicPayload);
    }
  }

  emitSessionProgress(payload: { sessionId?: string } & Record<string, unknown>) {
    if (payload.sessionId) {
      this.server
        .to(`session:${String(payload.sessionId)}`)
        .emit('session.progress.updated', payload);
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length);
    }

    return undefined;
  }
}
