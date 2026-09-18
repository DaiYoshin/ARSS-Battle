# ARSSバトル 公開用ソース

ゲーム実行用のコードと画像、検証・配布用スクリプトを収録しています。制作素材・録画・旧Git履歴は含みません。

## 起動

リポジトリ直下で実行し、http://127.0.0.1:8766/ を開きます。

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory sprite-playground
```

## ビルド

Python 3のみで生成できます。生成物はGit管理対象外です。

```sh
python3 sprite-playground/scripts/build-standalone.py
python3 sprite-playground/scripts/build-web.py
```

単体版は `sprite-playground.html`、Web配布版は `dist/arss-battle/` と `arss-battle-cloudflare.zip` です。

## 検証

単体版をビルドした後、Node.jsで実行します。

```sh
node sprite-playground/tests/combat.cjs
node sprite-playground/tests/ai.cjs
node sprite-playground/tests/input.cjs
node sprite-playground/tests/recording.cjs
node sprite-playground/tests/match-flow.cjs
```

ブラウザー検証はPlaywrightとChromiumがある環境で `node sprite-playground/tests/canvas-menus.cjs` を実行します。

操作方法・ゲーム仕様は [ゲームREADME](sprite-playground/README.md) を参照してください。
