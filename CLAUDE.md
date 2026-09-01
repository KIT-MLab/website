# ml-project-site

京都工芸繊維大学の学生主体プロジェクト「AI・機械学習を全課程で0から学べるプロジェクト」の公式Webサイト。

## プロジェクトの背景

- 詳細は `C:\Users\haruk\Desktop\機械学習研究会\# プロジェクト概要.txt` を参照
- サイトの3つの役割: ①プロジェクト紹介 ②活動・成果の公開 ③機械学習を学べる場所（将来的にインタラクティブ教材を追加）
- 想定読者はAIを知らない人を含む。専門用語を並べず、初見でも活動内容が分かること
- トーン: 近未来AI風を前面に出さない。「大学の学生プロジェクトとしての信頼感 + 技術系らしさ」

## 技術構成

- Astro（minimal テンプレート起点）。インタラクティブ教材は将来 React 等の島として追加予定
- デプロイ先: Cloudflare（Workers 静的アセット方式）。リポジトリ https://github.com/KIT-MLab/website の main への push で自動デプロイ
- 公開URL: https://website.kit-machine-learning.workers.dev （`.pages.dev` ではない）

## デザインワークフロー（最重要ルール）

デザインに関する決定は Claude が単独で行わない。必ず:

1. 複数の方向性・選択肢を提示する（2案以上）
2. ユーザーが選択する
3. 選択結果を `design/DECISIONS.md` とデザイントークンに記録する
4. 以後はその決定に従い、新しいデザイン要素が必要になったら再び選択肢を出す

理由: LLM の裁量が増えるほど LLM 好みのデザイン（青偏重・AI特有の定型）に寄るため。
`.claude/skills/hallmark` の hallmark スキルをデザイン案出しと slop チェックに使う。

## 作業ルール

- デザイン決定済みの項目は `design/DECISIONS.md` を必ず参照してから作業する
- push 等の git 操作は Claude が代行する（GitHub 連携後）

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
