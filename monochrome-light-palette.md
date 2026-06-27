# Монохромна світла палітра — Vault Money

Світлий аналог монохромної dark-теми. Той самий принцип: нейтральні сірі
без кольорового підтону + один акцент (чистий чорний, який інвертує активний
елемент). Натхнена Linear, Vercel, Stripe Dashboard, Mercury (light mode).

**Принцип:** дзеркало темної теми. Інверсія = «обрано» (чорний блок + білий
текст). Ієрархія — поверхами яскравості (тут навпаки: глибші поверхи трохи
темніші за фон). Колір — лише на числах і статусах.

---

## 1. Базова нейтральна шкала

Анкер фону — `#fcfcfd` (майже білий, теплий-нейтральний). Поверхи (card,
header) трохи світліші/контрастніші, бордюри тонкі та нейтральні.

| Токен         | Hex       | Призначення                            |
| ------------- | --------- | -------------------------------------- |
| `white`       | `#ffffff` | Card / table / modal surface           |
| `neutral-050` | `#fcfcfd` | Page background (анкер)                |
| `neutral-100` | `#f6f6f7` | Sidebar / nav background               |
| `neutral-150` | `#f1f1f3` | Hover surface, header rows             |
| `neutral-200` | `#e9e9ec` | Hover surface (вищий), inputs selected |
| `neutral-250` | `#e2e2e6` | Borders (subtle)                       |
| `neutral-300` | `#d6d6db` | Borders (visible)                      |
| `neutral-400` | `#b3b3bb` | Disabled / inactive                    |
| `neutral-500` | `#8a8a93` | Subdued text                           |
| `neutral-600` | `#6b6b74` | Secondary / light text                 |
| `neutral-700` | `#4a4a52` | —                                      |
| `neutral-800` | `#2e2e34` | Primary text                           |
| `neutral-900` | `#1d1d20` | Brightest / heading text               |
| `black`       | `#161617` | Акцент (active, primary button)        |

## 2. Акцент та інверсія

Дві ролі акценту (дзеркально до темної теми):

- **Лаймовий `#c8f23f`** — єдиний кольоровий акцент (CTA, активний бар
  графіка, лого-крапка). На світлому фоні лайм яскравий, тож текст на ньому —
  `#161617`, і застосовувати точково.
- **Чорний `#161617`** — інверсія для нейтральних «обрано» станів (активний
  пункт сайдбару, selected pill/row). Текст — `#fcfcfd`.

| Роль                   | Hex       |
| ---------------------- | --------- |
| Accent (lime)          | `#c8f23f` |
| Accent hover           | `#b8e22f` |
| On-accent text         | `#161617` |
| Neutral active (black) | `#161617` |
| Neutral active hover   | `#2e2e34` |
| On-neutral-active text | `#fcfcfd` |

```css
--color-accent: #c8f23f;
--color-accentHover: #b8e22f;
--color-accentText: #161617;
```

> Примітка: на світлій темі для **primary-кнопок** лайм може давати слабкий
> контраст тексту в дрібних елементах. Якщо потрібна максимальна
> читабельність CTA — лиши primary чорним (`#161617`), а лайм використовуй
> для активного бару графіка, лого та виділень. Нижче primary залишено
> чорним саме з цієї причини; лайм винесено в окремий `--color-accent`.

## 3. Семантичні кольори (точково)

Трохи темніші за dark-версію — щоб лишався контраст на світлому фоні.

| Роль               | Hex       |
| ------------------ | --------- |
| Positive (income)  | `#1f9d6b` |
| Negative (expense) | `#d83a45` |
| Warning            | `#b8870f` |
| Info               | `#6b6b74` |

Приглушені для фонів: `rgba(31,157,107,0.10)`, `rgba(216,58,69,0.10)`,
`rgba(184,135,15,0.12)`.

---

## 4. CSS-змінні (готові до вставки в тему Actual)

```css
/* ===== Page ===== */
--color-pageBackground: #fcfcfd;
--color-pageBackgroundModalActive: #fcfcfd;
--color-pageBackgroundTopLeft: #fcfcfd;
--color-pageBackgroundBottomRight: #fcfcfd;
--color-pageBackgroundLineTop: #e2e2e6;
--color-pageBackgroundLineMid: #e2e2e6;
--color-pageBackgroundLineBottom: #e2e2e6;
--color-pageText: #2e2e34;
--color-pageTextLight: #6b6b74;
--color-pageTextSubdued: #8a8a93;
--color-pageTextDark: #161617;
--color-pageTextPositive: #161617;
--color-pageTextLink: #161617;
--color-pageTextLinkLight: #2e2e34;

/* ===== Card ===== */
--color-cardBackground: #ffffff;
--color-cardBorder: #e2e2e6;
--color-cardShadow: rgba(0, 0, 0, 0.06);

/* ===== Table ===== */
--color-tableBackground: #ffffff;
--color-tableRowBackgroundAlternate: #ffffff;
--color-tableRowBackgroundHover: #f1f1f3;
--color-tableText: #2e2e34;
--color-tableTextItemAdded: #2e2e34;
--color-tableTextLight: #2e2e34;
--color-tableTextSubdued: #8a8a93;
--color-tableTextSelected: #161617;
--color-tableTextHover: #161617;
--color-tableTextInactive: #8a8a93;
--color-tableHeaderText: #6b6b74;
--color-tableHeaderBackground: #f6f6f7;
--color-tableBorder: #e2e2e6;
--color-tableBorderSelected: #161617;
--color-tableBorderHover: #b3b3bb;
--color-tableBorderSeparator: #e2e2e6;
--color-tableRowBackgroundHighlight: #f1f1f3;
--color-tableRowBackgroundHighlightText: #161617;
--color-tableRowHeaderBackground: #f6f6f7;
--color-tableRowHeaderText: #161617;

/* ===== Numbers ===== */
--color-numberPositive: #1f9d6b;
--color-numberNegative: #d83a45;
--color-numberNeutral: #8a8a93;
--color-budgetNumberNegative: var(--color-numberNegative);
--color-budgetNumberZero: var(--color-tableTextSubdued);
--color-budgetNumberNeutral: var(--color-tableText);
--color-budgetNumberPositive: var(--color-numberPositive);
--color-templateNumberFunded: var(--color-numberPositive);
--color-templateNumberUnderFunded: #b8870f;
--color-toBudgetPositive: #1f9d6b;
--color-toBudgetZero: var(--color-numberNeutral);
--color-toBudgetNegative: var(--color-budgetNumberNegative);

/* ===== Sidebar (інверсія активного елемента) ===== */
--color-sidebarBackground: #f6f6f7;
--color-sidebarItemBackgroundPending: #b8870f;
--color-sidebarItemBackgroundPositive: #1f9d6b;
--color-sidebarItemBackgroundFailed: #d83a45;
--color-sidebarItemAccentSelected: #fcfcfd;
--color-sidebarItemBackgroundHover: #e9e9ec;
--color-sidebarItemBackgroundSelected: #161617; /* активний блок — чорний */
--color-sidebarItemText: #6b6b74;
--color-sidebarItemTextHighlight: #161617;
--color-sidebarItemTextUpdated: #161617;
--color-sidebarItemTextSelected: #fcfcfd; /* текст активного — світлий */
--color-sidebarBudgetName: #161617;

/* ===== Menu ===== */
--color-menuBackground: #ffffff;
--color-menuItemBackground: #ffffff;
--color-menuItemBackgroundHover: #f1f1f3;
--color-menuItemText: #2e2e34;
--color-menuItemTextHover: #161617;
--color-menuItemTextSelected: #161617;
--color-menuItemTextHeader: #6b6b74;
--color-menuBorder: #e2e2e6;
--color-menuBorderHover: #161617;
--color-menuKeybindingText: #8a8a93;
--color-menuAutoCompleteBackground: #ffffff;
--color-menuAutoCompleteBackgroundHover: #f1f1f3;
--color-menuAutoCompleteText: #2e2e34;
--color-menuAutoCompleteTextHeader: #6b6b74;
--color-menuAutoCompleteItemText: var(--color-menuItemText);

/* ===== Modal ===== */
--color-modalBackground: #ffffff;
--color-modalBorder: #e2e2e6;
--color-overlayBackground: rgba(22, 22, 23, 0.3);

/* ===== Mobile ===== */
--color-mobileHeaderBackground: #f6f6f7;
--color-mobileHeaderText: #161617;
--color-mobileHeaderTextSubdued: #8a8a93;
--color-mobileHeaderTextHover: rgba(22, 22, 23, 0.06);
--color-mobilePageBackground: #fcfcfd;
--color-mobileNavBackground: #f6f6f7;
--color-mobileNavItem: #8a8a93;
--color-mobileNavItemSelected: #161617;
--color-mobileAccountShadow: rgba(0, 0, 0, 0.08);
--color-mobileAccountText: #2e2e34;
--color-mobileTransactionSelected: #f1f1f3;
--color-mobileViewTheme: var(--color-mobileHeaderBackground);
--color-mobileConfigServerViewTheme: #f6f6f7;

/* ===== Markdown ===== */
--color-markdownNormal: #2e2e34;
--color-markdownDark: #6b6b74;
--color-markdownLight: #161617;

/* ===== Buttons: Menu ===== */
--color-buttonMenuText: #6b6b74;
--color-buttonMenuTextHover: #161617;
--color-buttonMenuBackground: transparent;
--color-buttonMenuBackgroundHover: #f1f1f3;
--color-buttonMenuBorder: #e2e2e6;
--color-buttonMenuSelectedText: #fcfcfd;
--color-buttonMenuSelectedTextHover: #fcfcfd;
--color-buttonMenuSelectedBackground: #161617;
--color-buttonMenuSelectedBackgroundHover: #2e2e34;
--color-buttonMenuSelectedBorder: #161617;

/* ===== Buttons: Primary (інвертована, чорна) ===== */
--color-buttonPrimaryText: #fcfcfd;
--color-buttonPrimaryTextHover: #fcfcfd;
--color-buttonPrimaryBackground: #161617;
--color-buttonPrimaryBackgroundHover: #2e2e34;
--color-buttonPrimaryBorder: #161617;
--color-buttonPrimaryShadow: rgba(0, 0, 0, 0.12);
--color-buttonPrimaryDisabledText: #b3b3bb;
--color-buttonPrimaryDisabledBackground: #e9e9ec;
--color-buttonPrimaryDisabledBorder: #e2e2e6;

/* ===== Buttons: Normal ===== */
--color-buttonNormalText: #2e2e34;
--color-buttonNormalTextHover: #161617;
--color-buttonNormalBackground: #ffffff;
--color-buttonNormalBackgroundHover: #f6f6f7;
--color-buttonNormalBorder: #d6d6db;
--color-buttonNormalShadow: rgba(0, 0, 0, 0.05);
--color-buttonNormalSelectedText: #fcfcfd;
--color-buttonNormalSelectedBackground: #161617;
--color-buttonNormalDisabledText: #b3b3bb;
--color-buttonNormalDisabledBackground: #f6f6f7;
--color-buttonNormalDisabledBorder: #e2e2e6;

/* ===== Buttons: Bare ===== */
--color-buttonBareText: #2e2e34;
--color-buttonBareTextHover: #161617;
--color-buttonBareDisabledText: #b3b3bb;
--color-buttonBareBackground: transparent;
--color-buttonBareDisabledBackground: transparent;
--color-buttonBareBackgroundHover: rgba(22, 22, 23, 0.05);
--color-buttonBareBackgroundActive: rgba(22, 22, 23, 0.1);

/* ===== Calendar ===== */
--color-calendarText: #161617;
--color-calendarBackground: #f6f6f7;
--color-calendarItemText: #2e2e34;
--color-calendarItemBackground: #e9e9ec;
--color-calendarSelectedBackground: #161617;
--color-calendarCellBackground: #ffffff;

/* ===== Notice / Warning / Error ===== */
--color-noticeBackground: rgba(31, 157, 107, 0.1);
--color-noticeBackgroundLight: rgba(31, 157, 107, 0.05);
--color-noticeBackgroundDark: rgba(31, 157, 107, 0.18);
--color-noticeText: #1f9d6b;
--color-noticeTextLight: #1f9d6b;
--color-noticeTextDark: #178055;
--color-noticeTextMenu: #1f9d6b;
--color-noticeBorder: #1f9d6b;
--color-warningBackground: rgba(184, 135, 15, 0.12);
--color-warningText: #b8870f;
--color-warningTextLight: #b8870f;
--color-warningTextDark: #946c0b;
--color-warningBorder: #b8870f;
--color-errorBackground: rgba(216, 58, 69, 0.1);
--color-errorText: #d83a45;
--color-errorTextDark: #b22d37;
--color-errorTextDarker: #8f242c;
--color-errorTextMenu: #d83a45;
--color-errorBorder: #d83a45;

/* ===== Upcoming ===== */
--color-upcomingBackground: #f1f1f3;
--color-upcomingText: #2e2e34;
--color-upcomingBorder: #e2e2e6;

/* ===== Forms ===== */
--color-formLabelText: #6b6b74;
--color-formLabelBackground: #f6f6f7;
--color-formInputBackground: #ffffff;
--color-formInputBackgroundSelected: #f6f6f7;
--color-formInputBackgroundSelection: #e9e9ec;
--color-formInputBorder: #d6d6db;
--color-formInputTextReadOnlySelection: #f1f1f3;
--color-formInputBorderSelected: #161617;
--color-formInputText: #2e2e34;
--color-formInputTextSelected: #161617;
--color-formInputTextPlaceholder: #8a8a93;
--color-formInputTextPlaceholderSelected: #6b6b74;
--color-formInputTextSelection: #2e2e34;
--color-formInputShadowSelected: rgba(22, 22, 23, 0.12);
--color-formInputTextHighlight: #161617;

/* ===== Checkbox ===== */
--color-checkboxText: #2e2e34;
--color-checkboxBackgroundSelected: #161617;
--color-checkboxBorderSelected: #161617;
--color-checkboxShadowSelected: transparent;
--color-checkboxToggleBackground: #d6d6db;
--color-checkboxToggleBackgroundSelected: #161617;
--color-checkboxToggleDisabled: #f1f1f3;

/* ===== Pills ===== */
--color-pillBackground: #f1f1f3;
--color-pillBackgroundLight: #f6f6f7;
--color-pillText: #2e2e34;
--color-pillTextHighlighted: #161617;
--color-pillBorder: #e2e2e6;
--color-pillBorderDark: #d6d6db;
--color-pillBackgroundSelected: #161617;
--color-pillTextSelected: #fcfcfd;
--color-pillBorderSelected: #161617;
--color-pillTextSubdued: #8a8a93;

/* ===== Reports / Charts (монохромні + точковий акцент) ===== */
--color-reportsRed: #d83a45;
--color-reportsBlue: #6b6b74;
--color-reportsGreen: #1f9d6b;
--color-reportsGray: #8a8a93;
--color-reportsLabel: #2e2e34;
--color-reportsInnerLabel: #ffffff;
--color-reportsNumberPositive: #1f9d6b;
--color-reportsNumberNegative: #d83a45;
--color-reportsNumberNeutral: var(--color-numberNeutral);
--color-reportsChartFill: var(--color-reportsNumberPositive);

/* ===== Notes / Tags ===== */
--color-noteTagBackground: #f1f1f3;
--color-noteTagBackgroundHover: #e9e9ec;
--color-noteTagDefault: #f1f1f3;
--color-noteTagText: #2e2e34;

/* ===== Budget ===== */
--color-budgetOtherMonth: #f6f6f7;
--color-budgetCurrentMonth: #ffffff;
--color-budgetHeaderOtherMonth: #f6f6f7;
--color-budgetHeaderCurrentMonth: #f1f1f3;

/* ===== Floating action bar / Tooltip ===== */
--color-floatingActionBarBackground: #161617;
--color-floatingActionBarBorder: #2e2e34;
--color-floatingActionBarText: #fcfcfd;
--color-tooltipText: #fcfcfd;
--color-tooltipBackground: #161617;
--color-tooltipBorder: #2e2e34;
```

---

## 5. Як працює дзеркальність тем

| Аспект            | Dark                              | Light                                         |
| ----------------- | --------------------------------- | --------------------------------------------- |
| Анкер фону        | `#161617`                         | `#fcfcfd`                                     |
| Акцент / інверсія | білий `#ffffff`                   | чорний `#161617`                              |
| Текст активного   | `#161617` (темний)                | `#fcfcfd` (світлий)                           |
| Найглибший поверх | card `#1c1c1e` (світліший за фон) | card `#ffffff` (світліший за фон)             |
| Бордюр            | `#2c2c30`                         | `#e2e2e6`                                     |
| Income / Expense  | `#3ddc97` / `#f0616d`             | `#1f9d6b` / `#d83a45` (темніші для контрасту) |

Акцент світлої теми = анкер темної (`#161617`), і навпаки — теми
буквально віддзеркалені.

## 6. Принципи застосування

- **Інверсія = «обрано».** Чорний блок `#161617` + світлий текст `#fcfcfd`
  резервуй виключно для активного/обраного стану (sidebar item, primary
  button, selected pill, checkbox). Hover ≠ вибір — для hover лише
  легке притемнення поверху (`#f1f1f3` / `#e9e9ec`).
- **Surface > background.** На світлій темі картки/таблиці беруть чистий
  білий `#ffffff`, який «спливає» над теплувато-сірим фоном `#fcfcfd`.
  Sidebar навпаки трохи темніший за фон (`#f6f6f7`) — щоб відмежуватись.
- **Бордюри тонкі й нейтральні.** `#e2e2e6` для розділювачів, `#d6d6db`
  де потрібен видимий контур. Чорний бордюр — тільки focus/selected.
- **Тіні дуже легкі.** `rgba(0,0,0,0.05–0.06)` — на світлому фоні глибокі
  тіні виглядають брудно; глибину дає surface + бордюр, а не тінь.
- **Колір лише на числах і статусах.** Решта інтерфейсу монохромна.

## 7. Контраст (WCAG)

| Пара                   | Ratio    | Статус                                     |
| ---------------------- | -------- | ------------------------------------------ |
| `#2e2e34` на `#fcfcfd` | ≈ 12.4:1 | AAA                                        |
| `#6b6b74` на `#fcfcfd` | ≈ 5.3:1  | AA                                         |
| `#8a8a93` на `#fcfcfd` | ≈ 3.4:1  | AA (тільки для great/subdued, не для body) |
| `#1f9d6b` на `#ffffff` | ≈ 3.3:1  | AA для великого тексту/іконок              |
| `#d83a45` на `#ffffff` | ≈ 4.3:1  | AA                                         |

Subdued `#8a8a93` лиши для дрібних службових міток; для основного тексту
використовуй `#2e2e34`, для вторинного — `#6b6b74`.

## 8. Типографіка (рекомендація)

Спільна з темною темою: **Inter** / **IBM Plex Sans** для UI,
`font-variant-numeric: tabular-nums` (`styles.tnum` / `FinancialText`) для
всіх грошових сум.
