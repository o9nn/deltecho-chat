import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { LMTPServer, LMTPConfig } from '../dovecot-interface/lmtp-server.js';

describe('LMTPServer', () => {
  let server: LMTPServer;
  const testConfig: LMTPConfig = {
    socketPath: '127.0.0.1:2525',
    allowedDomains: ['example.com', 'test.local'],
  };

  beforeEach(() => {
    server = new LMTPServer(testConfig);
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('constructor', () => {
    it('should create server with default timeout and max message size', () => {
      expect(server).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig: LMTPConfig = {
        socketPath: '/tmp/test-lmtp.sock',
        allowedDomains: ['*'],
        timeout: 30000,
        maxMessageSize: 10 * 1024 * 1024,
      };
      const customServer = new LMTPServer(customConfig);
      expect(customServer).toBeDefined();
    });
  });

  describe('event handling', () => {
    it('should register event listeners', () => {
      const callback = jest.fn();
      server.on('email', callback);

      // Simulate emitting an event
      server.emit('email', { subject: 'Test' });

      expect(callback).toHaveBeenCalledWith({ subject: 'Test' });
    });

    it('should handle multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      server.on('email', callback1);
      server.on('email', callback2);

      server.emit('email', { subject: 'Test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('MIME parsing', () => {
    it('should parse basic email headers correctly', () => {
      // Access the private method through type casting for testing
      const parseEmail = (
        server as unknown as {
          parseEmail: (raw: string, from: string, to: string[]) => unknown;
        }
      ).parseEmail.bind(server);

      const rawEmail = [
        'From: sender@example.com',
        'To: recipient@example.com',
        'Subject: Test Subject',
        'Message-ID: <12345@example.com>',
        '',
        'This is the body of the email.',
      ].join('\r\n');

      const parsed = parseEmail(rawEmail, 'sender@example.com', ['recipient@example.com']) as {
        from: string;
        subject: string;
        messageId: string;
        body: string;
        attachments: unknown[];
      };

      expect(parsed.from).toBe('sender@example.com');
      expect(parsed.subject).toBe('Test Subject');
      expect(parsed.messageId).toBe('<12345@example.com>');
      expect(parsed.body).toBe('This is the body of the email.');
    });

    it('should handle multipart MIME messages with attachments', () => {
      const parseEmail = (
        server as unknown as {
          parseEmail: (raw: string, from: string, to: string[]) => unknown;
        }
      ).parseEmail.bind(server);

      const rawEmail = [
        'Content-Type: multipart/mixed; boundary="boundary123"',
        '',
        '--boundary123',
        'Content-Type: text/plain',
        '',
        'Plain text body',
        '--boundary123',
        'Content-Type: application/pdf',
        'Content-Disposition: attachment; filename="test.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        'SGVsbG8gV29ybGQ=',
        '--boundary123--',
      ].join('\r\n');

      const parsed = parseEmail(rawEmail, 'sender@example.com', ['recipient@example.com']) as {
        body: string;
        attachments: Array<{ filename: string; contentType: string }>;
      };

      expect(parsed.body).toBe('Plain text body');
      expect(parsed.attachments).toHaveLength(1);
      expect(parsed.attachments[0].filename).toBe('test.pdf');
      expect(parsed.attachments[0].contentType).toBe('application/pdf');
    });

    it('should decode quoted-printable content', () => {
      const decodeQuotedPrintable = (
        server as unknown as {
          decodeQuotedPrintable: (input: string) => Buffer;
        }
      ).decodeQuotedPrintable.bind(server);

      const encoded = 'Hello=20World=0D=0ANew=20Line';
      const decoded = decodeQuotedPrintable(encoded).toString('utf-8');

      expect(decoded).toBe('Hello World\r\nNew Line');
    });

    it('should decode base64 content', () => {
      const decodeBodyContent = (
        server as unknown as {
          decodeBodyContent: (body: string, contentType: string, encoding: string) => string;
        }
      ).decodeBodyContent.bind(server);

      const base64Content = Buffer.from('Hello World').toString('base64');
      const decoded = decodeBodyContent(base64Content, 'text/plain', 'base64');

      expect(decoded).toBe('Hello World');
    });

    it('should handle nested multipart messages', () => {
      const parseEmail = (
        server as unknown as {
          parseEmail: (raw: string, from: string, to: string[]) => unknown;
        }
      ).parseEmail.bind(server);

      const rawEmail = [
        'Content-Type: multipart/mixed; boundary="outer"',
        '',
        '--outer',
        'Content-Type: multipart/alternative; boundary="inner"',
        '',
        '--inner',
        'Content-Type: text/plain',
        '',
        'Plain text version',
        '--inner',
        'Content-Type: text/html',
        '',
        '<p>HTML version</p>',
        '--inner--',
        '--outer',
        'Content-Type: application/octet-stream',
        'Content-Disposition: attachment; filename="file.bin"',
        'Content-Transfer-Encoding: base64',
        '',
        'YmluYXJ5',
        '--outer--',
      ].join('\r\n');

      const parsed = parseEmail(rawEmail, 'sender@example.com', ['recipient@example.com']) as {
        body: string;
        attachments: Array<{ filename: string }>;
      };

      expect(parsed.body).toBe('Plain text version');
      expect(parsed.attachments).toHaveLength(1);
    });
  });
});
