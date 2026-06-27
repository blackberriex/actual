# Монохромна темна палітра — Vault Money

Сучасна монохромна dark-тема для фінансового веб-застосунку.
Натхнена Linear, Vercel, Stripe Dashboard, Mercury — нейтральні сірі +
один акцент (чистий білий, який інвертує активний елемент).

**Принцип:** колір не несе декоративного навантаження. Ієрархія будується
поверхами яскравості (elevation) і контрастом тексту, а не різнобарв'ям.
Семантичні кольори (green/red/amber) застосовуються лише точково — на
числах і статусах.

---

## 1. Базова нейтральна шкала

Анкер — `#161617`. Кожен наступний «поверх» трохи світліший.

| Токен         | Hex       | Призначення                           |
| ------------- | --------- | ------------------------------------- |
| `neutral-950` | `#161617` | Page background (анкер)               |
| `neutral-925` | `#19191b` | Sidebar / nav background              |
| `neutral-900` | `#1c1c1e` | Card / table / modal surface          |
| `neutral-850` | `#212123` | Elevated surface, header rows         |
| `neutral-800` | `#26262a` | Hover surface, pills, inputs selected |
| `neutral-750` | `#2c2c30` | Hover surface (вищий)                 |
| `neutral-700` | `#34343a` | Borders (subtle)                      |
| `neutral-600` | `#3d3d44` | Borders (visible)                     |
| `neutral-500` | `#5a5a63` | Disabled text, inactive               |
| `neutral-400` | `#6e6e77` | Subdued text                          |
| `neutral-300` | `#9a9aa3` | Secondary / light text                |
| `neutral-200` | `#c4c4cb` | —                                     |
| `neutral-100` | `#e6e6ea` | Primary text                          |
| `neutral-050` | `#f4f4f6` | Brightest text / dark-on-light        |
| `white`       | `#ffffff` | Акцент (active, primary button)       |

## 2. Акцент та інверсія

Дві ролі акценту:

- **Лаймовий `#c8f23f`** — єдиний кольоровий акцент (CTA-кнопки, активний бар
  графіка, лого-крапка, ключове виділення). Текст на лаймі — `#161617`.
- **Білий `#ffffff`** — інверсія для нейтральних «обрано» станів (активний
  пункт сайдбару, selected pill/row). Текст на білому — `#161617`.

| Роль                   | Hex       |
| ---------------------- | --------- |
| Accent (lime)          | `#c8f23f` |
| Accent hover           | `#b8e22f` |
| On-accent text         | `#161617` |
| Neutral active (white) | `#ffffff` |
| Neutral active hover   | `#e6e6ea` |
| On-neutral-active text | `#161617` |

```css
--color-accent: #c8f23f;
--color-accentHover: #b8e22f;
--color-accentText: #161617;
```

**Коли лайм, коли білий:** лайм — для головної дії/виділення на екрані
(одне на в'ю). Білий — для нейтральної інверсії «це обрано» (sidebar item,
selected row). Не фарбувати лаймом усі активні стани — він має лишатись
рідкісним.

## 3. Семантичні кольори (точково)

| Роль               | Hex       |
| ------------------ | --------- |
| Positive (income)  | `#3ddc97` |
| Negative (expense) | `#f0616d` |
| Warning            | `#e8c14a` |
| Info               | `#9a9aa3` |

Приглушені для фонів: `rgba(61,220,151,0.12)`, `rgba(240,97,109,0.12)`,
`rgba(232,193,74,0.12)`.

---

## 4. CSS-змінні (готові до вставки в тему Actual)

```css
/* ===== Page ===== */
--color-pageBackground: #161617;
--color-pageBackgroundModalActive: #161617;
--color-pageBackgroundTopLeft: #161617;
--color-pageBackgroundBottomRight: #161617;
--color-pageBackgroundLineTop: #2c2c30;
--color-pageBackgroundLineMid: #2c2c30;
--color-pageBackgroundLineBottom: #2c2c30;
--color-pageText: #e6e6ea;
--color-pageTextLight: #9a9aa3;
--color-pageTextSubdued: #6e6e77;
--color-pageTextDark: #f4f4f6;
--color-pageTextPositive: #ffffff;
--color-pageTextLink: #ffffff;
--color-pageTextLinkLight: #e6e6ea;

/* ===== Card ===== */
--color-cardBackground: #1c1c1e;
--color-cardBorder: #2c2c30;
--color-cardShadow: rgba(0, 0, 0, 0.24);

/* ===== Table ===== */
--color-tableBackground: #1c1c1e;
--color-tableRowBackgroundAlternate: #1c1c1e;
--color-tableRowBackgroundHover: #26262a;
--color-tableText: #e6e6ea;
--color-tableTextItemAdded: #e6e6ea;
--color-tableTextLight: #e6e6ea;
--color-tableTextSubdued: #6e6e77;
--color-tableTextSelected: #ffffff;
--color-tableTextHover: #ffffff;
--color-tableTextInactive: #6e6e77;
--color-tableHeaderText: #9a9aa3;
--color-tableHeaderBackground: #212123;
--color-tableBorder: #2c2c30;
--color-tableBorderSelected: #ffffff;
--color-tableBorderHover: #5a5a63;
--color-tableBorderSeparator: #2c2c30;
--color-tableRowBackgroundHighlight: #26262a;
--color-tableRowBackgroundHighlightText: #ffffff;
--color-tableRowHeaderBackground: #212123;
--color-tableRowHeaderText: #ffffff;

/* ===== Numbers ===== */
--color-numberPositive: #3ddc97;
--color-numberNegative: #f0616d;
--color-numberNeutral: #6e6e77;
--color-budgetNumberNegative: var(--color-numberNegative);
--color-budgetNumberZero: var(--color-tableTextSubdued);
--color-budgetNumberNeutral: var(--color-tableText);
--color-budgetNumberPositive: var(--color-numberPositive);
--color-templateNumberFunded: var(--color-numberPositive);
--color-templateNumberUnderFunded: #e8c14a;
--color-toBudgetPositive: #3ddc97;
--color-toBudgetZero: var(--color-numberNeutral);
--color-toBudgetNegative: var(--color-budgetNumberNegative);

/* ===== Sidebar (інверсія активного елемента) ===== */
--color-sidebarBackground: #19191b;
--color-sidebarItemBackgroundPending: #e8c14a;
--color-sidebarItemBackgroundPositive: #3ddc97;
--color-sidebarItemBackgroundFailed: #f0616d;
--color-sidebarItemAccentSelected: #161617;
--color-sidebarItemBackgroundHover: #26262a;
--color-sidebarItemBackgroundSelected: #ffffff; /* активний блок — білий */
--color-sidebarItemText: #9a9aa3;
--color-sidebarItemTextHighlight: #f4f4f6;
--color-sidebarItemTextUpdated: #ffffff;
--color-sidebarItemTextSelected: #161617; /* текст активного — темний */
--color-sidebarBudgetName: #ffffff;

/* ===== Menu ===== */
--color-menuBackground: #19191b;
--color-menuItemBackground: #19191b;
--color-menuItemBackgroundHover: #26262a;
--color-menuItemText: #e6e6ea;
--color-menuItemTextHover: #ffffff;
--color-menuItemTextSelected: #ffffff;
--color-menuItemTextHeader: #9a9aa3;
--color-menuBorder: #2c2c30;
--color-menuBorderHover: #ffffff;
--color-menuKeybindingText: #6e6e77;
--color-menuAutoCompleteBackground: #19191b;
--color-menuAutoCompleteBackgroundHover: #26262a;
--color-menuAutoCompleteText: #e6e6ea;
--color-menuAutoCompleteTextHeader: #9a9aa3;
--color-menuAutoCompleteItemText: var(--color-menuItemText);

/* ===== Modal ===== */
--color-modalBackground: #1c1c1e;
--color-modalBorder: #2c2c30;
--color-overlayBackground: rgba(0, 0, 0, 0.5);

/* ===== Mobile ===== */
--color-mobileHeaderBackground: #19191b;
--color-mobileHeaderText: #ffffff;
--color-mobileHeaderTextSubdued: #6e6e77;
--color-mobileHeaderTextHover: rgba(255, 255, 255, 0.1);
--color-mobilePageBackground: #161617;
--color-mobileNavBackground: #19191b;
--color-mobileNavItem: #6e6e77;
--color-mobileNavItemSelected: #ffffff;
--color-mobileAccountShadow: rgba(0, 0, 0, 0.35);
--color-mobileAccountText: #e6e6ea;
--color-mobileTransactionSelected: #26262a;
--color-mobileViewTheme: var(--color-mobileHeaderBackground);
--color-mobileConfigServerViewTheme: #19191b;

/* ===== Markdown ===== */
--color-markdownNormal: #e6e6ea;
--color-markdownDark: #9a9aa3;
--color-markdownLight: #ffffff;

/* ===== Buttons: Menu ===== */
--color-buttonMenuText: #9a9aa3;
--color-buttonMenuTextHover: #ffffff;
--color-buttonMenuBackground: transparent;
--color-buttonMenuBackgroundHover: #26262a;
--color-buttonMenuBorder: #2c2c30;
--color-buttonMenuSelectedText: #161617;
--color-buttonMenuSelectedTextHover: #161617;
--color-buttonMenuSelectedBackground: #ffffff;
--color-buttonMenuSelectedBackgroundHover: #e6e6ea;
--color-buttonMenuSelectedBorder: #ffffff;

/* ===== Buttons: Primary (лаймовий акцент) ===== */
--color-buttonPrimaryText: #161617;
--color-buttonPrimaryTextHover: #161617;
--color-buttonPrimaryBackground: #c8f23f;
--color-buttonPrimaryBackgroundHover: #b8e22f;
--color-buttonPrimaryBorder: #c8f23f;
--color-buttonPrimaryShadow: rgba(0, 0, 0, 0.35);
--color-buttonPrimaryDisabledText: #6e6e77;
--color-buttonPrimaryDisabledBackground: #26262a;
--color-buttonPrimaryDisabledBorder: #2c2c30;

/* ===== Buttons: Normal ===== */
--color-buttonNormalText: #e6e6ea;
--color-buttonNormalTextHover: #ffffff;
--color-buttonNormalBackground: #26262a;
--color-buttonNormalBackgroundHover: #2c2c30;
--color-buttonNormalBorder: #2c2c30;
--color-buttonNormalShadow: rgba(0, 0, 0, 0.24);
--color-buttonNormalSelectedText: #161617;
--color-buttonNormalSelectedBackground: #ffffff;
--color-buttonNormalDisabledText: #6e6e77;
--color-buttonNormalDisabledBackground: #1c1c1e;
--color-buttonNormalDisabledBorder: #2c2c30;

/* ===== Buttons: Bare ===== */
--color-buttonBareText: #e6e6ea;
--color-buttonBareTextHover: #ffffff;
--color-buttonBareDisabledText: #6e6e77;
--color-buttonBareBackground: transparent;
--color-buttonBareDisabledBackground: transparent;
--color-buttonBareBackgroundHover: rgba(255, 255, 255, 0.05);
--color-buttonBareBackgroundActive: rgba(255, 255, 255, 0.1);

/* ===== Calendar ===== */
--color-calendarText: #ffffff;
--color-calendarBackground: #19191b;
--color-calendarItemText: #e6e6ea;
--color-calendarItemBackground: #26262a;
--color-calendarSelectedBackground: #ffffff;
--color-calendarCellBackground: #1c1c1e;

/* ===== Notice / Warning / Error ===== */
--color-noticeBackground: rgba(61, 220, 151, 0.1);
--color-noticeBackgroundLight: rgba(61, 220, 151, 0.05);
--color-noticeBackgroundDark: rgba(61, 220, 151, 0.2);
--color-noticeText: #3ddc97;
--color-noticeTextLight: #3ddc97;
--color-noticeTextDark: #3ddc97;
--color-noticeTextMenu: #3ddc97;
--color-noticeBorder: #3ddc97;
--color-warningBackground: rgba(232, 193, 74, 0.1);
--color-warningText: #e8c14a;
--color-warningTextLight: #e8c14a;
--color-warningTextDark: #e8c14a;
--color-warningBorder: #e8c14a;
--color-errorBackground: rgba(240, 97, 109, 0.1);
--color-errorText: #f0616d;
--color-errorTextDark: #f0616d;
--color-errorTextDarker: #f0616d;
--color-errorTextMenu: #f0616d;
--color-errorBorder: #f0616d;

/* ===== Upcoming ===== */
--color-upcomingBackground: #26262a;
--color-upcomingText: #e6e6ea;
--color-upcomingBorder: #2c2c30;

/* ===== Forms ===== */
--color-formLabelText: #9a9aa3;
--color-formLabelBackground: #19191b;
--color-formInputBackground: #1c1c1e;
--color-formInputBackgroundSelected: #26262a;
--color-formInputBackgroundSelection: #2c2c30;
--color-formInputBorder: #2c2c30;
--color-formInputTextReadOnlySelection: #26262a;
--color-formInputBorderSelected: #5a5a63;
--color-formInputText: #e6e6ea;
--color-formInputTextSelected: #ffffff;
--color-formInputTextPlaceholder: #6e6e77;
--color-formInputTextPlaceholderSelected: #9a9aa3;
--color-formInputTextSelection: #e6e6ea;
--color-formInputShadowSelected: rgba(255, 255, 255, 0.12);
--color-formInputTextHighlight: #ffffff;

/* ===== Checkbox ===== */
--color-checkboxText: #e6e6ea;
--color-checkboxBackgroundSelected: #ffffff;
--color-checkboxBorderSelected: #ffffff;
--color-checkboxShadowSelected: transparent;
--color-checkboxToggleBackground: #26262a;
--color-checkboxToggleBackgroundSelected: #ffffff;
--color-checkboxToggleDisabled: #1c1c1e;

/* ===== Pills ===== */
--color-pillBackground: #26262a;
--color-pillBackgroundLight: #1c1c1e;
--color-pillText: #e6e6ea;
--color-pillTextHighlighted: #ffffff;
--color-pillBorder: #2c2c30;
--color-pillBorderDark: #2c2c30;
--color-pillBackgroundSelected: #ffffff;
--color-pillTextSelected: #161617;
--color-pillBorderSelected: #ffffff;
--color-pillTextSubdued: #6e6e77;

/* ===== Reports / Charts (монохромні + точковий акцент) ===== */
--color-reportsRed: #f0616d;
--color-reportsBlue: #9a9aa3;
--color-reportsGreen: #3ddc97;
--color-reportsGray: #6e6e77;
--color-reportsLabel: #e6e6ea;
--color-reportsInnerLabel: #1c1c1e;
--color-reportsNumberPositive: #3ddc97;
--color-reportsNumberNegative: #f0616d;
--color-reportsNumberNeutral: var(--color-numberNeutral);
--color-reportsChartFill: var(--color-reportsNumberPositive);

/* ===== Notes / Tags ===== */
--color-noteTagBackground: #26262a;
--color-noteTagBackgroundHover: #2c2c30;
--color-noteTagDefault: #26262a;
--color-noteTagText: #e6e6ea;

/* ===== Budget ===== */
--color-budgetOtherMonth: #161617;
--color-budgetCurrentMonth: #1c1c1e;
--color-budgetHeaderOtherMonth: #161617;
--color-budgetHeaderCurrentMonth: #212123;

/* ===== Floating action bar / Tooltip ===== */
--color-floatingActionBarBackground: #26262a;
--color-floatingActionBarBorder: #2c2c30;
--color-floatingActionBarText: #ffffff;
--color-tooltipText: #ffffff;
--color-tooltipBackground: #19191b;
--color-tooltipBorder: #2c2c30;
```

---

## 5. Що змінилося відносно поточної теми

| Аспект              | Було (`#191a1b`)                            | Стало (`#161617`)                                  |
| ------------------- | ------------------------------------------- | -------------------------------------------------- |
| Анкер фону          | синювато-сірий `#191a1b`                    | нейтральний `#161617`                              |
| Шкала сірих         | з блакитним підтоном (`#2d2f34`, `#98a1ae`) | чисто нейтральна (`#2c2c30`, `#9a9aa3`)            |
| Активний sidebar    | акцентна лінія + білий текст                | **повна інверсія** — білий блок, темний текст      |
| Поверхи (elevation) | 2 рівні                                     | 4 чіткі рівні: `161617 → 19191b → 1c1c1e → 212123` |
| Семантика           | насичені `#3ebd93 / #ef4e4e`                | трохи м'якші `#3ddc97 / #f0616d`                   |

## 6. Принципи застосування

- **Інверсія = «обрано».** Білий фон + темний текст резервуй виключно для
  активного/обраного стану (sidebar item, primary button, selected pill).
  Не використовуй білий fill для hover — для hover лише підняття поверху
  (`#26262a`).
- **Чотири поверхи.** Фон → nav → card → header. Не змішуй: таблиця завжди
  на `#1c1c1e`, її header на `#212123`.
- **Бордюри тонкі.** `#2c2c30` для розділювачів, `#3d3d44` лише там, де
  потрібен видимий контур. Білий бордюр — тільки для focus/selected.
- **Колір лише на числах і статусах.** Решта інтерфейсу монохромна.
- **Контраст.** `#e6e6ea` на `#161617` ≈ 13:1, `#9a9aa3` ≈ 6:1 — обидва
  проходять WCAG AA/AAA.

## 7. Типографіка (рекомендація)

Для фінтеху — нейтральний гротеск з табличними цифрами:
**Inter** або **IBM Plex Sans** для UI, `font-variant-numeric: tabular-nums`
(вже є `styles.tnum` / `FinancialText` у проєкті) для всіх грошових сум.
