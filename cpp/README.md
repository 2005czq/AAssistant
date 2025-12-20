# AAssistant

---

> A C++ Project used to calculate the bill when you and your friends go out.

## Input

Input all information into `info.txt` in the same folder.

Input $n$ as the total number of all members in the first line.

Input the name of all members in the second line, use spaces to separate the names, you must input $n$ names in this line.

Input bills in next several lines, one bill per line.

There are four commands to describe a bill:

- **AA**: `[Number] [Reason] [Total cost]`

  It describes `[Number]` pays `[Total cost]` for the `[Reason]`, all members should share the cost of this bill equally.

- **Join**: `[Number] [Reason] +[Total cost] [Joined number]( [Joined number] ...)`

  It is similar to the first way, but it only includes all the `[Joined number]` in the bill.

- **Remove**: `[Number] [Reason] -[Total cost] [Removed number]( [Removed number] ...)`

  It is similar to the first way, but it excludes all the `[Removed number]` in the bill.

- **Distribution**: `[Number] [Reason] [Number1 cost] [Number2 cost] ... [Numbern cost]`

  It describes `[Number]` pays `[Numberk cost]` to the $k$th member for the `[Reason]`.

> **Warning:**
>
> - `[Number]` represents the member's position from left to right in the name line.
> - In the Join command and Remove command, the joined numbers and removed numbers shouldn’t be repeated, and you should input at least one number after `[Total cost]`. The `+` or `-` symbol before `[Total cost]` is part of the command, not part of the `[Total cost]` itself.
>
> - In Distribution command, the `[Reason]` must be followed by $n$ digits.
> - Spaces and tabs are not allowed in the `[Reason]`.

## Output

The program calculates the bill and outputs the result to `bill.txt` and opens it automatically.

`bill.txt` is comprised of Bill and Result.

Each bill is in the following form:

```
[Name] pays for [Reason],
	[Name] should pay [Debt]
	[Name] should pay [Debt]
```

It shows in more details, and it won’t show the payer itself and somebody whose `[Debt]` equals to 0.

When sharing the cost, the `[Debt]` is rounded up to two decimal places.

Each result is in the following form:

```
[Name] should transfer [Total debt] to [Name]
```

## Example

```
3
崔芷琪 温慧雯 倪梦茹
1 打车到火锅店 17.72
1 牛肉火锅 +130 1 2 3
2 甜点 15 18 0
1 打车回学校 14.4
2 打车到高铁站 -25.53 3
```

The example shows that there are `3` members: 崔芷琪, 温慧雯 and 倪梦茹.

The first bill shows that the `1`(in the name line, that is 崔芷琪) pays `17.72` for the `打车到火锅店`.

The second bill shows that `1`(崔芷琪),`2`(温慧雯) and `3`(倪梦茹) should share the cost of this `130` bill paid by `1`(崔芷琪).

The third bill shows that the `2`(温慧雯) pays for the `甜点`, and `崔芷琪` should return `15` to `温慧雯`. It also shows that `温慧雯` should return `18` to `温慧雯`, but it won’t have any impact.

The forth bill is the same as the first bill.

The fifth bill shows that everyone except `3`(倪梦茹) should share the cost of this `25.53` bill paid by `2`(温慧雯).

Run the program and open `bill.txt` in the same folder, you will get the output:

```
****************Bill****************

崔芷琪 pays for 打车到火锅店,
	温慧雯 should pay 5.91
	倪梦茹 should pay 5.91
崔芷琪 pays for 牛肉火锅,
	温慧雯 should pay 43.34
	倪梦茹 should pay 43.34
温慧雯 pays for 甜点,
	崔芷琪 should pay 15.00
崔芷琪 pays for 打车回学校,
	温慧雯 should pay 4.80
	倪梦茹 should pay 4.80
温慧雯 pays for 打车到高铁站,
	崔芷琪 should pay 12.77

***************Result***************

倪梦茹 should transfer 54.05 to 温慧雯
温慧雯 should transfer 80.33 to 崔芷琪

************************************
```