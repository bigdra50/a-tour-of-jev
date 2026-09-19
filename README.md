# A Tour of Jev

TypeSafe の System One モデル Jev を、ブラウザで書いて実行して確かめるローカル教材です。
A Tour of Go と同じく、左の解説を読み、右のエディタでコードを書き換えて実行します。
答えは確率の目盛りや分布として表示されます。

TypeSafe AI の公式の教材ではありません。
内容は [TypeSafe のドキュメント](https://docs.typesafe.ai) をもとにしています。

## 起動

[Bun](https://bun.sh) 1.3 以降が必要です（`mise install` で入ります）。

```bash
git clone https://github.com/bigdra50/a-tour-of-jev.git
cd a-tour-of-jev
bun install
cp .env.example .env.local   # キーを書く
bun run dev                  # http://localhost:8765
```

## API キー

キーはサーバーの中だけで使い、ブラウザには送りません。
シェルで export した環境変数と `.env.local` の両方を読みます。

| 変数 | 用途 |
| --- | --- |
| `TYPESAFE_API_KEY` | TypeSafe の API を直接呼ぶ（`POST https://api.typesafe.ai/v1/systemone`） |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway 経由で Jev を呼ぶ。小型 LLM との比較・連携のレッスンにも使う |

- `vck_` で始まるキーは Vercel AI Gateway のキーとみなし、どの変数名に入っていても Gateway 用に使う
- シェルの `TYPESAFE_API_KEY` に Gateway のキーを入れたまま、`.env.local` の `TYPESAFE_API_KEY` に TypeSafe のキーを書いても、両方を使える
- 画面上部の「経路」で、TypeSafe 直と Vercel AI Gateway を切り替えられる

## レッスン

| 部 | 内容 |
| --- | --- |
| はじめの一歩 | Hello Jev、Noul、Choice、Score、型の選び方 |
| 入力を設計する | state の設計、説明の構造化、質問の分解 |
| 速さ・確率・費用 | 並列質問と投機、confidence による分岐、同じ質問の繰り返し、トークンと費用 |
| コードで組み立てる | ワークフロー、重みつきの合成、2 回に分けるとき |
| 限界と組み合わせ | 苦手なこと、日本語、小型 LLM との比較、LLM との組み合わせ、AI SDK と Gateway |

最後の「自由に試す」は課題のない実験場です。
書いたコードと進み具合はブラウザに保存されます。

## 開発

```bash
bun run check        # 型検査 + Biome + secretlint + テスト
bun test             # テストだけ
bun run secretlint   # キーの混入検査だけ
```

`bun install` すると `.githooks/pre-commit` が有効になり、コミットするファイルを secretlint で検査します。
推奨ルールに含まれる Vercel AI Gateway のキーに加え、TypeSafe のキー（`apikey_` で始まる）も検出します。

| 場所 | 中身 |
| --- | --- |
| `src/contract/` | Jev の HTTP 契約と、この教材のサーバー API の型・検証・価格 |
| `src/server/` | Bun のサーバー。キーの解決と、TypeSafe 直・Gateway・小型 LLM の 3 つの上流 |
| `src/web/runner/` | 学習者のコードを Web Worker で実行する仕組み |
| `src/web/lessons/` | レッスンの本文と課題の判定。初期コードは `code/*.js` |
| `src/web/app/` | React の画面 |

レッスンを足すときは `src/web/lessons/code/` に初期コードを置き、各部のファイルに本文を書きます。
テストは全レッスンの初期コードを偽の API で最後まで実行し、構文やプロパティ名の誤りを検出します。
`TYPESAFE_BASE_URL` を設定すると、TypeSafe 直の接続先を差し替えられます（公式 SDK と同じ変数名）。
