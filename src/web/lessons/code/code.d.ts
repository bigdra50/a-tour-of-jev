// レッスンの初期コードは本物の .js ファイルに置き、Bun の text ローダーで文字列として読み込む。
declare module "*.js" {
  const code: string;
  export default code;
}
