# WordHop

English vocabulary flashcards and games for PET and IELTS courses.

The current content includes Simply PET with eight Reading Tests and 250 words,
and Basic IELTS Reading with Units 4–11 and 379 words. The total is 629 words
across 16 units or tests.

Students study illustrated flashcards, then practise with matching, multiple
choice or fill-in-the-blank games without a word bank. Rounds default to all
words. The app includes card animations, pronunciation, feedback sounds and
browser-local progress and results.

## Publish on GitHub Pages

1. Put this project in a public GitHub repository. Keep the folders together,
   including `.github/workflows/pages.yml`.
2. Open the repository's Settings, then Pages. Under Build and deployment,
   set Source to GitHub Actions.
3. Push to `main`, or run Publish WordHop from the Actions tab.
4. Open the site URL returned by the deployment.

The workflow builds `_site/` and uploads only the website files. It uses
GitHub's standard Pages actions and needs no external service credentials.
It checks that every game includes all selected words before publishing.

The build changes asset URLs to relative paths, so unit JSON and pictures load
correctly when the site is published under a repository path such as `/wordhop/`.
It updates content hashes whenever those files change. Navigation uses hashes,
so links to units work without server rewrites.

## Build locally

```sh
python3 -B scripts/build_github_pages.py
python3 -B qa/check_github_pages.py
node qa/check-all-words.cjs
```

Serve `_site/` with a static server to preview the built app. Edit source files
in `dist/`; the next build recreates `_site/`. No npm dependencies or framework
build are required.

## Update vocabulary

The import scripts and source provenance are included under `scripts/` and
`source-assets/`. To import slides or the supplied Simply PET tables, use the
commands in each source folder's README. Content import requires Python, lxml
and Pillow. Original user uploads are not part of this repository.

Importers update the catalog and hashed unit JSON in `dist/`. The Pages build
then prepares the correct relative URLs automatically. Stable word IDs preserve
existing progress when content is updated on the same website.

## Student progress

Progress and completed rounds are saved in each visitor's browser using
localStorage. They do not sync between devices. Changing from the previous
website address to a GitHub Pages address does not automatically transfer that
browser's saved progress. No student accounts or shared database are required.
