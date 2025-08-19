## pahadi preservation

a lean, static website for preserving and sharing the beautiful pahadi language. it features a searchable dictionary, a history page, and a works section that embeds external audio/video. deployed to github pages.

## origin
it started off as an effort to preserver outer siraji (pahari) dialect of my hometown but then expanded to pahari in general since pahari is sadly not preserved well at all - with zero properly accesible records available onlone.

the main source of data is 'A Dictionary Of Pahari Dialects' published in 1909 by 'Himachal Academy of Arts Culture And Languages' who's scanned mirror was on [archive.org](https://archive.org/details/in.ernet.dli.2015.223292/page/n11/mode/2up).

the 1909 pahari dictionary, which is a compilation of various pahari dictionaries from the time is sadly one of the ONLY resources available online. we are in 2025 and there has been no effort to digitize pahari dictionaries or literature. foregoing this, pahari remains to be classified as definitely endangered - and yet, there is almost no effort to preserve it. this is necessary to preserve a unique himalayan culture that is embodied throughout the language. 

## process
regardless of the availability of the dictionary, the automatic OCR was unreliable and atmost produced garbled words. there was a lot of LLMs and manual work to get the data in a usable format. manual human oversight was done but for a project of this size, it might have produced some errors - feel free to fix them and make a pull request if needed. there could also have been some words which were missed altogether so ji bhaan, kora help.

## highlights
- static, no database. content lives in this repo.
- dictionary sourced from a curated csv (`maindictionary.csv`).
- client-side instant search with a small prebuilt index.
- external media embeds only for now (youtube, archive.org, etc.).
- github actions auto-builds and deploys on every push to `main`.


### data model (concise)
`maindictionary.csv` headers:
- `word`, `part_of_speech`, `etymology`, `definition`, `examples_and_notes`, `source_page`


### editing data
- edit `maindictionary.csv` and commit. the github action will rebuild and deploy automatically.
- for local preview, run `npm run build` again after changes - `npm run serve` to see the changes.


### roadmap (short)
- extract the rules of the language from the grammar book.
- find out wtf is wrong with the second proverb????
- adding kinnauri data from the same source.
- categorizing the words by dialects [segregating bilaspuri, siraji, etc. as filters]
- script toggle (devanagari/roman; add takri later).
- works filters (type/year) and richer cards.
- optional decap cms for git-based editing.
- extracting folklores, proverbs. available in the source:
    - the main dictionary is from page 11 onwards and goes till page 130.
    - appendices (Folklore, Proverbs, Riddles, Songs) from page 131 onwards.
    - a Grammar and Dictionary of Kanwari (a completely separate work) from page 157 onwards.

### license
- site code: mit (unless noted otherwise).
- content and data: see per-file attributions; some items may be public-domain or cc-licensed.



It is not a formal pronunciation key but rather a list of examples that show how certain sounds are represented, often with their Devanagari script equivalents. Below is the extracted and cleaned-up information from that page.

## Guide from Page 6
This page provides examples to help understand the sounds and orthography used in the dictionary:

ā as in Bishar (बिषर) and Bhyansar (भ्यांसर).

āṅ as in Bhan (भान) Small coins.

āṇḍ as in chandal (चाण्डाल) A wicked man.

aiṅ as in Chains (भैंस) A buffalo.

auṅ as in Kayň (कौङ) A Lotus.

ḍh as in Kahunga (कढंगण) not well shaped.

ch as in chachenu (चचेणु) To cry or scream.

e as in Ser (सेर) = time.

é as in Kafér (कफेर) Difficulty.

o as in Goli (गोलि) I Apes II A bullet.

ó as in Berī (बेड़ी) I Iron fetters II A boat.

a as in Abalṛī (अबलड़ी) A small skin bag.

o as in Kḍolī (क्डोली) Bread made of Koda.

ṛn as in Barḍnu (बरड्णु) To walk, to go on.

eṅ as in Keṅsī (केंन्सी) on which day?

yā as in Byātr (ब्यात्र) A kind of tree.

o as in Gór (गोर) = A Lizard.

th as in Bātho (बाठो) A mad spirit which causes sickness.

tā as in Katāī (कताई) The act of spinning.

chā as in Kachāī (कचाई) The act of cutting.

ū as in Būg (बूग) A cover.

ā'k as in Bulā'k (कुलाक) A nose ring.

wā as in Diwāň (दिवाण) The man who speaks on behalf of a deity.

gl as in Āglā (आगला) The former.

āṭ as in Bāṭ (बाट) A path.

## Structure of the Dictionary Entries
Following the guide, the main dictionary starts on page 8. The entries are structured in a consistent format:

Word: The main entry word in the Pahari dialect, presented in bold.

Part of Speech: An abbreviation for the word's grammatical function (e.g., n.m. for masculine noun, adj. for adjective, v.t. re. for transitive verb).

Etymology: The origin of the word, if known, is given in parentheses, usually with the source language abbreviated (e.g., (S. ...) for Sanskrit, (H. ...) for Hindi).

Definition: The English meaning of the word.

Notes & Examples: Occasionally, an example of its use in a phrase or additional context is provided.