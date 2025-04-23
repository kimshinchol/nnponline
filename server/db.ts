import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// 네온 웹소켓 설정
neonConfig.webSocketConstructor = ws;

// 환경변수 확인
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// 연결 주소 준비
const connectionString = process.env.DATABASE_URL;

// 풀 인스턴스를 외부에서 조작 가능하도록 전역 변수로 선언
let poolInstance: Pool | null = null;

// 새로운 풀 생성 함수
const createPool = () => new Pool({ 
  connectionString,
  ssl: true,
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 60000,
  max: 10,
  min: 2,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
  retryIntervalMillis: 1000,
  maxRetries: 5
});

// recreatePool: 기존 pool을 재생성
export const recreatePool = () => {
  poolInstance = createPool();
  setupPoolListeners(poolInstance); // 새 pool에도 이벤트 연결
  return poolInstance;
};

// getPool: 항상 최신 pool을 반환
export const getPool = (): Pool => {
  if (!poolInstance) {
    poolInstance = createPool();
    setupPoolListeners(poolInstance);
  }
  return poolInstance;
};

// drizzle에서 사용할 db 객체 export
export const db = drizzle({ client: getPool(), schema });

// pool 이벤트 핸들링 함수
const setupPoolListeners = (pool: Pool) => {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      recreatePool(); // 에러 시 pool 재생성 시도
    }, 5000);
  });

  pool.on('connect', () => console.log('✅ DB 연결 성공'));
  pool.on('acquire', () => console.log('▶️ DB 풀에서 커넥션 획득'));
  pool.on('remove', () => console.log('❌ DB 커넥션 제거'));
};

// 초기 pool 셋업
getPool();
