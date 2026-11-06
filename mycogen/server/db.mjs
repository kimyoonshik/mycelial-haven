// PostgreSQL 연결과 표 만들기. 접속 정보는 DATABASE_URL (server.env) 하나로 받습니다.
//   예) DATABASE_URL=postgres://mycogen:비밀번호@127.0.0.1:5432/mycogen
import pg from 'pg';

// DATE 칸은 'YYYY-MM-DD' 글자 그대로 받습니다(자바스크립트 Date로 바꾸면 시간대 때문에 하루씩 밀릴 수 있음).
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
pool.on('error', (e) => console.error('DB 연결 오류:', e.message)); // 대기 중인 연결이 끊겨도 서버는 계속 동작

/** 쿼리 하나: 결과 행 배열 */
export const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
/** 쿼리 하나: 첫 행(없으면 undefined) */
export const one = async (sql, params = []) => (await pool.query(sql, params)).rows[0];

// 서버를 켤 때마다 실행합니다. 이미 있는 표는 그대로 둡니다.
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      created_at  timestamptz NOT NULL DEFAULT now(),
      name        text NOT NULL,
      company     text,
      email       text NOT NULL,
      phone       text,
      topic       text,
      message     text NOT NULL,
      lang        text,
      ip          text,
      mail_status text
    );
    CREATE INDEX IF NOT EXISTS inquiries_created_at ON inquiries (created_at);

    CREATE TABLE IF NOT EXISTS posts (
      id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      kind       text NOT NULL CHECK (kind IN ('news', 'blog')),
      date       date NOT NULL,
      category   text,
      title      text NOT NULL,
      summary    text,
      body       text,
      image      text,
      published  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS posts_kind_date ON posts (kind, date DESC, id DESC);
  `);
}
