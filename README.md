# ARSSバトル

7体のキャラクターと4つのステージでCPUと対戦する2D格闘ゲームです。ゲーム本体、画像、ビルドスクリプト、テストを収録しています。

## 起動

以下のコマンドはすべてリポジトリ直下で実行します。Python 3が必要です。

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory sprite-playground
```

http://127.0.0.1:8766/ をブラウザーで開きます。終了時はターミナルで Ctrl+C を押してください。ソースの `index.html` を直接開くと起動案内が表示されます。

操作方法は [遊び方](sprite-playground/README.md) を参照してください。

## 配布ファイルの作成

Pythonの追加ライブラリは不要です。必要な形式のコマンドを実行してください。

| 形式 | コマンド | 出力 |
|---|---|---|
| 単体HTML | `python3 sprite-playground/scripts/build-standalone.py` | `sprite-playground.html` |
| Webサイト | `python3 sprite-playground/scripts/build-web.py` | `dist/arss-battle/` と `arss-battle-cloudflare.zip` |

単体HTMLは画像を内包し、ブラウザーで直接開けます。Webサイト版は出力フォルダの中身を静的サイトとして配信します。生成物はGitに含めず、必要なときに作成します。

### Cloudflare Workersに配置する場合

Node.jsとnpmが必要です。Webサイト版をビルドしてから実行します。

```sh
npx wrangler login
npx wrangler deploy
```

`wrangler.jsonc` の `name` は配置先のWorker名です。自分のアカウントと配置先を確認して実行してください。同名のWorkerがある場合は更新対象になります。

## テスト

Node.js 20以上が必要です。先に単体HTMLを生成してください。

```sh
python3 sprite-playground/scripts/build-standalone.py
node sprite-playground/tests/combat.cjs
node sprite-playground/tests/ai.cjs
node sprite-playground/tests/input.cjs
node sprite-playground/tests/recording.cjs
node sprite-playground/tests/match-flow.cjs
```

### ブラウザーテスト

npmで固定バージョンのPlaywrightをインストールし、対応するChromiumを取得します。

```sh
npm install
npx playwright install chromium
node sprite-playground/tests/canvas-menus.cjs
```

Linuxでブラウザーのシステム依存が不足する場合は `npx playwright install --with-deps chromium` を使用します。

ソース版と単体HTML版の画面操作・対戦・録画を検証します。確認画像などは `.qa-canvas/` に生成され、Gitには含まれません。
