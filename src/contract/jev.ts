// Jev (TypeSafe System One) の HTTP 契約と、この教材のサーバー API 契約。
// ブラウザ・サーバー・テストがすべてこの型を参照する。
// 正本: https://docs.typesafe.ai/api

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** instructions / criteria の各値。文字列・JSON オブジェクト・配列・null を受け付ける。 */
export type EntryType = string | { readonly [key: string]: JsonValue } | readonly JsonValue[] | null;

/** 評価対象。文字列・JSON オブジェクト・配列のいずれか（配列も 1 つの state として扱われる）。 */
export type State = string | { readonly [key: string]: JsonValue } | readonly JsonValue[];

export interface NoulQuestion {
  readonly type: "noul";
  readonly instructions?: EntryType;
  readonly criteria?: { readonly true?: EntryType; readonly false?: EntryType } | null;
}

export interface ChoiceQuestion {
  readonly type: "choice";
  readonly instructions?: EntryType;
  /** 選択肢名 → 説明。1〜255 個。 */
  readonly criteria: Readonly<Record<string, EntryType>>;
}

export interface ScoreQuestion {
  readonly type: "score";
  readonly instructions?: EntryType;
  /** 低い順に並べたレベルの説明。2〜10 個。 */
  readonly criteria: readonly EntryType[];
}

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export type QuestionType = Question["type"];
export type Questions = Readonly<Record<string, Question>>;

export interface SystemOneRequest {
  readonly state: State;
  readonly questions: Questions;
  readonly model?: string;
}

export interface NoulAnswer {
  readonly type: "noul";
  /** yes である確率（0〜1）。 */
  readonly noul: number;
}

export interface ChoiceAnswer {
  readonly type: "choice";
  readonly choice: string;
  /**
   * 選択肢ごとの確率（合計 1）。
   * Jev は常に返す。LLM で同じ質問を評価した場合は返らない。
   */
  readonly probabilities?: Readonly<Record<string, number>>;
  /** 分布の尖り具合から導かれる確信度（0〜1）。LLM 評価では返らない。 */
  readonly confidence?: number;
}

export interface ScoreAnswer {
  readonly type: "score";
  /** レベル番号の確率加重平均。レベルの間に落ちることがある。 */
  readonly score: number;
  /** レベル番号（文字列）→ 確率。LLM 評価では返らない。 */
  readonly probabilities?: Readonly<Record<string, number>>;
  readonly confidence?: number;
  /** レベル番号（文字列）→ レベルの説明。 */
  readonly legend?: Readonly<Record<string, EntryType>>;
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface Usage {
  readonly input_tokens: number;
  readonly output_tokens: number;
}

export interface SystemOneResponse {
  /** 実際に回答したモデル。エイリアス指定時もバージョン付き ID が返る。 */
  readonly model: string;
  readonly answers: Readonly<Record<string, Answer>>;
  readonly usage: Usage;
}

// ---- この教材のサーバー API ----

/** Jev の呼び出し経路。typesafe は api.typesafe.ai 直、gateway は Vercel AI Gateway 経由。 */
export type ProviderId = "typesafe" | "gateway";

/** 上流へ実際に送った内容（学習用に表示する）。API キーは含めない。 */
export interface UpstreamTrace {
  readonly method: "POST";
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export interface CallMeta {
  readonly provider: ProviderId | "llm";
  /** サーバーで測った上流呼び出しの所要時間（ミリ秒）。 */
  readonly latencyMs: number;
  /** 単価が分からない LLM では null（無料と誤表示しないため）。 */
  readonly costUsd: number | null;
  readonly upstream: UpstreamTrace;
  readonly notes: readonly string[];
}

/** POST /api/systemone の本文。 */
export interface PlaygroundSystemOneRequest extends SystemOneRequest {
  readonly provider?: ProviderId;
}

/** POST /api/systemone の応答。上流の応答に meta を足したもの。 */
export interface PlaygroundSystemOneResponse extends SystemOneResponse {
  readonly meta: CallMeta;
}

/** POST /api/llm/evaluate の本文。state と questions は Jev と同じ形で渡す。 */
export interface LlmEvaluateRequest {
  readonly model: string;
  readonly state: State;
  readonly questions: Questions;
}

export interface LlmEvaluateResponse extends SystemOneResponse {
  readonly meta: CallMeta;
}

/** POST /api/llm/generate の本文。 */
export interface LlmGenerateRequest {
  readonly model: string;
  readonly prompt: string;
  readonly system?: string;
  readonly maxOutputTokens?: number;
}

export interface LlmGenerateResponse {
  readonly model: string;
  readonly text: string;
  readonly usage: Usage;
  readonly meta: CallMeta;
}

export type ApiErrorCode = "invalid_request" | "forbidden" | "provider_unavailable" | "upstream_error" | "internal";

export interface ApiErrorBody {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    /** 上流が返した HTTP ステータス（上流エラー時のみ）。 */
    readonly upstreamStatus?: number;
    /** 入力検証で見つかった問題（invalid_request 時）。 */
    readonly issues?: readonly string[];
    /** 上流のエラー本文など。 */
    readonly details?: unknown;
  };
}

export interface ProviderStatus {
  readonly configured: boolean;
  /** キーの出どころ（例: "TYPESAFE_API_KEY（環境変数）"）。値そのものは含めない。 */
  readonly from?: string;
  /** 末尾 4 文字だけ残したキー（例: "vck_…a1b2"）。 */
  readonly masked?: string;
}

export interface LlmModelInfo {
  readonly id: string;
  readonly name: string;
  /** 1 トークンあたりの USD。 */
  readonly inputPerToken: number;
  readonly outputPerToken: number;
}

/** GET /api/status の応答。 */
export interface StatusResponse {
  readonly providers: Readonly<Record<ProviderId, ProviderStatus>>;
  readonly defaultProvider: ProviderId | null;
  /** LLM 連携（Gateway 経由）が使えるか。 */
  readonly llmAvailable: boolean;
  readonly jevModels: Readonly<Record<ProviderId, readonly string[]>>;
  readonly llmModels: readonly LlmModelInfo[];
  readonly notes: readonly string[];
}
