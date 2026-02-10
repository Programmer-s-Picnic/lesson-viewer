Perfect.
Below is a **complete, classroom-ready lesson** with **full screenplay + teacher–student dialogs**, flowing naturally from concept → demo → practice → **ending with the exact text outputs shown in the trailer image** (all **printable with `f""`**, no images).

You can **read this aloud**, **paste into notes**, or **convert directly into HTML** later.

---

# 🎬 CLASS SCREENPLAY

## **“Today we are not learning logic — we are learning presentation.”**

---

## 🎥 OPENING SCENE (0–2 minutes)

**Teacher (calm, confident):**

> Good evening everyone.

(Pause)

> Today, we are not learning logic.
> **Today, we are learning presentation.**

**Student 1:**
Sir… presentation? Like PowerPoint?

**Teacher (smiles):**
No.
Presentation means **how your program speaks to humans**.

---

## 🎯 SETTING THE CONTEXT

**Teacher:**
Let me ask you something.

(Types quickly)

```python
print("Rahul", 85)
print("Amit", 9)
print("Suman", 100)
```

**Teacher:**
This code is **correct**.
But does it look **trustworthy**?

**Students (together):**
No sir.

**Teacher:**
Exactly.
Computers care about correctness.
**Humans care about clarity.**

---

## 🧠 CORE IDEA (Say this slowly)

**Teacher:**

> Logic decides **what** to print.
>
> **Presentation decides whether people trust it.**

Today we’ll use:

* `print()`
* `f""`
* alignment
* spacing
* width

---

## 🧪 DEMO 1 — WHY f-STRINGS MATTER

**Teacher:**

```python
name = "Rahul"
marks = 85
print(f"Name: {name}, Marks: {marks}")
```

**Teacher:**
Readable. Clean. Professional.

**Student 2:**
Sir, can we do calculations inside `f""`?

**Teacher:**
Yes — and that’s why we use it.

```python
print(f"Percentage: {marks/100*100}%")
```

---

## 🧱 DEMO 2 — ALIGNMENT (THE GAME CHANGER)

**Teacher:**
Watch this carefully.

```python
print(f"{'Apple':<10} {10:>5}")
print(f"{'Banana':<10} {200:>5}")
print(f"{'Mango':<10} {5:>5}")
```

**Teacher:**
Same data.
Different presentation.

**Student 3:**
Sir, why left and right?

**Teacher:**
Because:

* **Text → left aligned**
* **Numbers → right aligned**

That’s how reports work everywhere.

---

## 📌 RULES (WRITE ON BOARD)

```
{text:<width}   → left
{number:>width} → right
{text:^width}   → center
```

---

## 🧪 DEMO 3 — TABS vs REAL ALIGNMENT

**Teacher:**

```python
print("Rahul\t85")
print("Suman\t100")
```

**Teacher:**
Tabs look okay…
until names change length.

**Teacher (firm):**

> Tabs are shortcuts.
> Alignment is engineering.

---

## 🎯 NOW THE REAL OUTPUTS

### (Everything below is EXACTLY what the trailer promised)

---

# ✅ OUTPUT 1 — **STUDENT MARKSHEET**

```python
print("=" * 35)
print(f"{'STUDENT MARKSHEET':^35}")
print("=" * 35)

print(f"{'Name':<15}: {'Rahul'}")
print(f"{'Roll No':<15}: {25}")

print("-" * 35)

print(f"{'Math':<15}: {85:>3}")
print(f"{'Science':<15}: {78:>3}")
print(f"{'English':<15}: {92:>3}")

print("-" * 35)
print(f"{'Result':<15}: {'PASS'}")
```

📌 **Teacher (say this):**
“This is not an image.
This is **text behaving like a document**.”

---

# ✅ OUTPUT 2 — **PAN CARD INFO (TEXT FORMAT)**

```python
print("=" * 40)
print(f"{'PAN CARD INFORMATION':^40}")
print("=" * 40)

print(f"{'Name':<15}: {'Aakash Singh'}")
print(f"{'PAN No':<15}: {'BNZPS1234J'}")
print(f"{'DOB':<15}: {'15/08/1895'}")

print("=" * 40)
```

**Teacher:**
Government software prints text like this.
**No images. Just discipline.**

---

# ✅ OUTPUT 3 — **MULTIPLICATION TABLE**

```python
print("=" * 25)
print(f"{'MULTIPLICATION TABLE':^25}")
print("=" * 25)

n = 7
for i in range(1, 6):
    print(f"{n:>2} x {i:<2} = {n*i:>3}")
```

Output style:

```
 7 x 1  =   7
 7 x 2  =  14
 7 x 3  =  21
```

**Student:**
Sir, this looks like a book!

**Teacher:**
Exactly.

---

# ✅ OUTPUT 4 — **BILL STATEMENT**

```python
print("=" * 35)
print(f"{'BILL STATEMENT':^35}")
print("=" * 35)

print(f"{'Item':<15}{'Qty':>5}{'Total':>10}")
print("-" * 35)

print(f"{'Pen':<15}{4:>5}{40:>10}")
print(f"{'Notebook':<15}{2:>5}{150:>10}")

print("-" * 35)
print(f"{'Grand Total':<20}{190:>15}")
```

---

## 🧠 FINAL CLASS REALIZATION

**Teacher (slow, calm):**

> We didn’t learn new logic today.
>
> We learned **respect for the reader**.

---

## 🎤 CLOSING DIALOG (VERY IMPORTANT)

**Student:**
Sir, why is this so important?

**Teacher:**
Because in the real world:

* Your boss won’t read messy output
* Your user won’t trust ugly reports
* Your logic will be ignored if presentation is weak

---

## 🏁 FINAL LINE (END THE CLASS WITH THIS)

**Teacher:**

> **Today we did not learn logic.
> We learned presentation.**

(Pause)

> And that is what turns students into developers.

---

## 📦 WHAT YOU CAN DO NEXT (OPTIONAL)

If you want, next I can:

* Convert this screenplay into a **single HTML lesson**
* Add **student practice tasks**
* Add **Saturday test MCQs**
* Turn outputs into **downloadable `.txt` report templates**

Just say **Proceed** 👍



Perfect.
Below is a **full teaching screenplay for NUMBER FORMATTING**, written exactly in the **7 PM class style** — with **teacher dialogue, student reactions, board notes, live coding flow, and strong closing**.

This is **not notes** — this is **how you actually teach it**.

---

# 🎬 TEACHING SCREENPLAY

## **“Numbers Don’t Lie — But Formatting Builds Trust”**

---

## 🎥 OPENING SCENE (0–2 minutes)

**Teacher (calm, confident):**
Good evening everyone.

(Pause)

> Yesterday, we learned how to align text.
>
> **Today, we will learn how to discipline numbers.**

(Pause)

> Because badly formatted numbers
> **destroy trust instantly.**

---

## 🧠 SET THE PROBLEM (VERY IMPORTANT)

**Teacher types on screen:**

```python
print("Salary:", 3000)
print("Salary:", 3000.5)
print("Salary:", 3000.56789)
```

**Teacher:**
All three are correct.

Now tell me honestly…

**Teacher (looks at students):**
Which one looks professional?

**Student:**
Sir… none of them.

**Teacher (nods):**
Exactly.

---

## 🎯 CORE IDEA (SAY THIS SLOWLY)

**Teacher:**

> Computers store numbers.
>
> **Humans read formats.**

Today’s class is about **how numbers should look**, not how they’re calculated.

---

## 🧩 INTRODUCING NUMBER FORMATTING

**Teacher:**
In Python, f-strings don’t just print numbers.

They can **control**:

* Decimal places
* Width
* Commas
* Leading zeros
* Signs (`+` / `-`)
* Percentages

---

## 🧪 DEMO 1 — DECIMAL PLACES (`.2f`)

**Teacher types:**

```python
price = 12.5
print(f"Price: {price}")
print(f"Price: {price:.2f}")
```

**Teacher:**
Same number.

But this…

```
12.50
```

…looks final.
Finished.
Official.

**Teacher (important line):**

> Money is **never shown without decimals**.

---

## 🧪 DEMO 2 — FIXED DECIMAL DISCIPLINE

**Teacher types:**

```python
a = 10
b = 10.1
c = 10.1234

print(f"{a:.2f}")
print(f"{b:.2f}")
print(f"{c:.2f}")
```

**Teacher:**
Different values.
Same format.

That’s **discipline**.

---

## 🧠 BOARD NOTE (WRITE THIS)

```
:.2f  → always show 2 decimal places
```

---

## 🧪 DEMO 3 — RIGHT ALIGNING NUMBERS

**Teacher:**

```python
print(f"{12.5:>10.2f}")
print(f"{123.45:>10.2f}")
print(f"{5.00:>10.2f}")
```

**Teacher:**
Why right aligned?

**Student:**
So digits line up, sir.

**Teacher:**
Correct.

> **Numbers must line up by units place.**

---

## 🧪 DEMO 4 — COMMAS IN NUMBERS

**Teacher types:**

```python
salary = 2530000
print(f"{salary}")
print(f"{salary:,}")
print(f"{salary:,.2f}")
```

Output:

```
2530000
2,530,000
2,530,000.00
```

**Teacher:**
Same value.
Very different confidence level.

---

## 🧠 TEACHER LINE (MEMORABLE)

> “If money has no commas, it looks fake.”

---

## 🧪 DEMO 5 — ZERO PADDING (IDs)

**Teacher types:**

```python
order_id = 45
print(f"{order_id}")
print(f"{order_id:05}")
```

Output:

```
45
00045
```

**Teacher:**
Why do we do this?

**Student:**
Fixed width, sir.

**Teacher:**
Correct.

> IDs must look consistent, not small or big.

---

## 🧪 DEMO 6 — SIGNS (+ / -)

**Teacher:**

```python
print(f"{2000:+.2f}")
print(f"{-750.5:+.2f}")
```

Output:

```
+2000.00
-750.50
```

**Teacher:**
In banking…

> **Sign matters more than number.**

---

## 🧪 DEMO 7 — PERCENTAGES

**Teacher:**

```python
score = 0.856
print(f"{score}")
print(f"{score:.2%}")
```

Output:

```
85.60%
```

**Teacher:**
Computers store decimals.
Humans read percentages.

---

## 🧱 FULL LIVE DEMO — SALARY SLIP (TEXT)

**Teacher types slowly:**

```python
print("=" * 40)
print(f"{'SALARY SLIP':^40}")
print("=" * 40)

print(f"{'Basic Pay':<20}{25000:>15,.2f}")
print(f"{'HRA':<20}{8500.5:>15,.2f}")
print(f"{'Tax':<20}{-3200:>15,.2f}")

print("-" * 40)
print(f"{'Net Salary':<20}{30300.5:>15,.2f}")
```

**Teacher (pause):**
This is not advanced Python.

This is **professional Python**.

---

## 🧠 CHECKPOINT QUESTIONS (ASK LIVE)

1. Why do we force `.2f`?
2. Why are numbers right aligned?
3. Why do IDs need leading zeros?
4. Which looks more trustworthy: `3000` or `3,000.00`?

---

## 🎤 CLOSING DIALOG

**Student:**
Sir, logic is easy…
Formatting is harder.

**Teacher (smiles):**
Exactly.

> Logic makes programs work.
> **Formatting makes people believe them.**

---

## 🏁 FINAL LINE (END CLASS WITH THIS)

**Teacher:**

> Today we did not learn new math.
>
> **We learned respect for numbers.**

(Pause)

> That is how real software is written.

---

If you want next, I can:

* Combine **alignment + number formatting** into a **capstone screenplay**
* Create a **Saturday test paper**
* Make **teacher-only answer keys**
* Convert this into a **single HTML lesson page**

Just say **Proceed** 👍





Got it 👍
You’re absolutely right — **assignments must NOT repeat what you already taught live**.
They should **transfer the skill**, not copy the demo.

Below is a **fresh, non-duplicate assignment set** that **uses the same presentation skills** but applies them to **new situations**.

These are **true practice tasks**, not rewrites of class examples.

---

# 🧑‍🎓 ASSIGNMENTS

## *Applying Presentation Skills (`print`, `f""`, alignment)*

> **Important Rule for All Assignments**
> ❌ Do NOT copy class examples
> ✅ Use alignment, spacing, width, and formatting creatively
> ❌ No tabs (`\t`)
> ✅ Use `f""` only

---

## 🟢 ASSIGNMENT 1 — Daily Schedule Card

### 🎯 Skill Focus

* Left & right alignment
* Clean labels

### Task

Print a **Daily Schedule** like this (content can vary):

```
------------------------------
DAILY SCHEDULE
------------------------------
Morning     : Study
Afternoon   : Classes
Evening     : Practice
Night       : Revision
------------------------------
```

### Constraints

* Title centered
* Labels left aligned
* Values neatly aligned

---

## 🟢 ASSIGNMENT 2 — Temperature Report

### 🎯 Skill Focus

* Number alignment
* Consistent column width

### Task

Create a **Weather Report (Text)** for 5 days.

Example layout:

```
------------------------------
DAY        TEMP (°C)
------------------------------
Monday         34
Tuesday        36
Wednesday      33
Thursday       35
Friday         32
```

### Constraints

* Numbers right aligned
* Same width for all rows

---

## 🟡 ASSIGNMENT 3 — ATM Mini Receipt

### 🎯 Skill Focus

* Borders
* Professional formatting

### Task

Print an **ATM Receipt**:

Required fields:

* Bank Name
* Account No (masked)
* Amount Withdrawn
* Balance

Example structure:

```
================================
ATM RECEIPT
================================
Bank        : ABC Bank
Account No : XXXX1234
Withdrawn  : 2000
Balance    : 15000
================================
```

---

## 🟡 ASSIGNMENT 4 — Exam Hall Ticket (TEXT)

### 🎯 Skill Focus

* Section separation
* Alignment consistency

### Task

Print an **Exam Hall Ticket** with:

* Student Name
* Roll No
* Subject
* Exam Date
* Center Name

### Constraints

* Title centered
* Clean separators
* Looks official

---

## 🟡 ASSIGNMENT 5 — Restaurant Menu Card

### 🎯 Skill Focus

* Multi-column layout
* Pricing alignment

### Task

Create a **Menu Card**:

```
-------------------------------
ITEM                PRICE
-------------------------------
Tea                    10
Coffee                 25
Sandwich               40
-------------------------------
```

### Constraints

* Item names left aligned
* Prices right aligned
* Clean table structure

---

## 🔵 ASSIGNMENT 6 — Monthly Expense Summary

### 🎯 Skill Focus

* Totals
* Structured output

### Task

Print a **Monthly Expense Summary**:

* Rent
* Food
* Travel
* Misc
* Total

### Constraint

* Total must stand out visually
* Columns aligned

---

## 🔵 ASSIGNMENT 7 — Creative Professional Output

### 🎯 Skill Focus

* Design thinking with text

### Choose ONE:

* Library issue slip
* Bus ticket (text version)
* Online order confirmation
* Coaching institute fee receipt

### Requirements

* Border
* Centered heading
* At least **3 aligned sections**

---

## 🧠 REFLECTION QUESTIONS (Must Answer)

Students must answer **in plain text**:

1. Why does alignment matter more than tabs?
2. Which outputs looked most professional?
3. Where would bad formatting cause problems in real life?

---

## 🏁 SUBMISSION RULES

✅ Code only
✅ Clean output screenshot
❌ No copied examples
❌ No tabs

---

## 🎤 LINE TO SAY IN CLASS (Powerful)

> “If your assignment looks neat, your thinking is neat.”

---

If you want next, I can:

* Provide **evaluation rubrics**
* Create **sample solutions (teacher-only)**
* Convert assignments into **Google Form / HTML**
* Design a **Saturday test based on these**

Just say **Proceed** 👍



Absolutely — **number formatting is a must**, and you’re right to explicitly separate it from alignment.
Below is a **clean extension of the assignment set**, focused **only on number formatting skills**, without repeating what you teach live.

These tasks force students to **think about how numbers are shown**, not how they’re calculated.

---

# 🧑‍🎓 ASSIGNMENTS — NUMBER FORMATTING

## *Using f-strings (`f""`) like professionals*

> **Golden Rule for These Assignments**
> ❌ No new logic tricks
> ❌ No tabs
> ✅ Focus on **how numbers look**
> ✅ Use `f""` formatting only

---

## 🟢 ASSIGNMENT 8 — Fixed Decimal Display

### 🎯 Skill Focus

* Decimal precision (`.2f`)
* Consistent numeric appearance

### Task

Print a **Fuel Price Board**:

```
----------------------------
FUEL PRICE BOARD
----------------------------
Petrol      : 102.50
Diesel      : 89.75
CNG         : 78.00
----------------------------
```

### Rules

* All prices must show **exactly 2 decimal places**
* Even whole numbers must show `.00`

---

## 🟢 ASSIGNMENT 9 — Percentage Report

### 🎯 Skill Focus

* Percentage formatting (`.2%`)
* Clean presentation

### Task

Print a **Result Summary**:

```
----------------------------
RESULT SUMMARY
----------------------------
Math        : 85.00%
Science     : 78.00%
English     : 92.00%
----------------------------
```

### Rules

* Convert decimals to percentage format
* Show exactly **2 decimal places**

---

## 🟡 ASSIGNMENT 10 — Zero-Padded Identifiers

### 🎯 Skill Focus

* Zero padding (`:04`, `:06`)

### Task

Print an **Order Confirmation**:

```
----------------------------
ORDER CONFIRMATION
----------------------------
Order ID    : 000245
Customer ID : 001092
----------------------------
```

### Rules

* IDs must always appear with fixed width
* Leading zeros are mandatory

---

## 🟡 ASSIGNMENT 11 — Currency Alignment

### 🎯 Skill Focus

* Right-aligned currency
* Fixed width columns

### Task

Create a **Salary Breakdown**:

```
-------------------------------
SALARY BREAKDOWN
-------------------------------
Basic Pay           25,000.00
HRA                 8,500.50
Tax                -3,200.00
-------------------------------
Net Salary          30,300.50
```

### Rules

* Numbers right aligned
* Use commas for thousands
* Two decimal places required

---

## 🟡 ASSIGNMENT 12 — Comparison Table

### 🎯 Skill Focus

* Width consistency
* Decimal alignment

### Task

Print a **Product Comparison**:

```
--------------------------------
PRODUCT        PRICE     RATING
--------------------------------
Phone          14,999.00     4.5
Laptop         54,500.00     4.7
Tablet         22,300.00     4.2
```

### Rules

* Prices formatted with commas
* Ratings aligned vertically

---

## 🔵 ASSIGNMENT 13 — Banking Statement (Advanced)

### 🎯 Skill Focus

* Signs (`+`, `-`)
* Visual clarity of money movement

### Task

Print a **Mini Bank Statement**:

```
----------------------------------
DATE        AMOUNT        BALANCE
----------------------------------
01-02-26   +2,000.00     12,500.00
03-02-26     -750.50     11,749.50
05-02-26     -500.00     11,249.50
```

### Rules

* `+` and `-` must align
* Two decimal places always
* Balance column strictly right aligned

---

## 🧠 REQUIRED REFLECTION (Mandatory)

Students must answer:

1. Why is `25` different from `25.00` in reports?
2. Why are leading zeros important in IDs?
3. What looks more trustworthy: `3000` or `3,000.00` — and why?

---

## 🏁 SUBMISSION CHECKLIST

✔ Used `f""`
✔ No tabs
✔ Numbers formatted consistently
✔ Output looks professional

---

## 🎤 LINE YOU CAN SAY IN CLASS (Strong)

> **“Computers store numbers. Humans read formats.”**

---

If you want next, I can:

* Merge **alignment + number formatting** into a single **grading rubric**
* Provide **teacher-only sample outputs**
* Convert these into **auto-checked tests**
* Turn this into a **capstone mini-project**

Just say **Proceed** 👍
