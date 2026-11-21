"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  /** 親の大きさに合わせる。親は relative + サイズ指定しておく */
  sizes?: string;
  className?: string;
  fallback?: React.ReactNode;
  eager?: boolean;
};

/**
 * ユーザー投稿の写真用。
 * - 形式やサイズがまちまちなので、SVG と外部 URL は最適化を通さない
 * - 読み込みに失敗したら fallback を出す（投稿画像が消えても画面が壊れない）
 */
export function Photo({ src, alt, sizes = "400px", className = "", fallback, eager }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback ?? <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#f3eadb_0_8px,#ece0cc_8px_16px)]" />}</>;

  const unoptimized = src.endsWith(".svg") || /^https?:\/\//.test(src);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={unoptimized}
      loading={eager ? "eager" : undefined}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
