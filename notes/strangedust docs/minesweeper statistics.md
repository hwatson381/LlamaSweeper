# Minesweeper Statistics

## 3BV
### Bechtel's Board Benchmark Value
Purpose is to measure board difficulty. 

3BV is the minimum number of left clicks required to win the game. 

Each opening is one click and each number that does not touch an opening is one click. 

## 3BV/s
### 3BV per second
Formula: `3BV / Time`

Purpose is to measure solving speed.

## IOS
### Index of Speed
Formula: `log (3BV) / log (Time)`

Purpose is to measure solving speed.

## RQP
### Rapport Qualité Prix
Formula: `(Time + 1) / 3BV/s`

Purpose is to measure level of solving skill.  Lower is better.

## IOE
### Index of Efficiency
Formula: `3BV / Total Clicks`

Purpose is to measure efficiency. 

A 3BV 50 Intermediate game completed in 50 clicks has an IOE of 1.00. 

It is possible to be more efficient than 1.00 by using chording. 

## Cl/s
### Clicks per second
Amount of clicks per second that a player executes, whether they be left clicks, right clicks, chords or even wasted clicks.

## Ce
### Effective Click
A click that changed the state of the board. 

## Ce/s
### Effective clicks per Second
The purpose is to provide a metric that still increases based on solving, even if 3bv/s does not increase.

The border squares of an opening will not increase 3bv solved, even though the player is still solving the board.

## Correctness
Formula: `Effective Clicks / Total Clicks`

Purpose is to measure percentage of effective clicks. 

## Throughput
Formula: `3BV / Effective Clicks`

Purpose is to measure the effectiveness of useful clicks.

For example, if you solve a 3BV 50 Intermediate game in 85 clicks, but only 62 clicks change the state of the board, your Throughput is 0.81.

## MOV
Formula: `path / time`

Pixels per second of mouse movement.

Note: players who use square sizes larger than 16 pixels will have higher values.

## OBV
### Optimized Board Value
Formula (beg): `0.07 * <total number of squares> + 0.43 * <3BV> + 2.27 * <openings>`

Formula (int): `0.20 * <total number of squares> + 0.32 * <3BV> + 1.38 * <openings>`

Formula (exp): `0.38 * <total number of squares> + 0.23 * <3BV> + 0.99 * <openings>`

An index showing the difficulty level of the board with 3BV modified.

Created by using multiple regression.

## QG
### Quality Grade
Formula: `(Time ** 1.7) / 3bv`

A speed statistic, lower is better.

Used in the calculation of STNB.

## STNB
### Shītǐ niú bī (尸体牛逼)
Formula: `(87.420 * (Level ^ 2) - 155.829 * Level + 115.708) / QG * ((Solved 3BV / 3BV) ^ 0.5)`

STNB, also known as Shītǐ niú bī (尸体牛逼), is the most balanced speed statistic. The higher the better.

The short formula of STNB is constant/QG, where QG = Time^1.7/3bv. 

The constants corresponding to the three levels (beginner, intermediate, and expert) are respectively 47.299, 153.73, and 435.001. 

These constants are to make the STNB of the three levels played at the same skill level roughly equal.

## ZiNi
Fewest clicks required to solve the board.

Purpose is to measure board difficulty for players who use flags. 

This is difficult to calculate because the most efficient way to solve a board depends on your starting position (or requires perfect knowledge of the board in advance). 

Currently, all ZiNi algorithms are approximations and do not necessarily guarantee the actual lowest clicks required.
