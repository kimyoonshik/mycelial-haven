// /media/… 경로를 빌드의 기준 경로(base)에 맞춘다.
// 일반 배포(base "/")에서는 그대로이고, 하위 폴더나 미리보기 빌드(base "./")에서도 이미지가 깨지지 않게 한다.
export const media = <T extends string | undefined | null>(path: T): T =>
  (typeof path === "string" && path.startsWith("/media/") ? `${import.meta.env.BASE_URL}${path.slice(1)}` : path) as T;
