# Scope and Goals

::: warning
The engine is not designed for optimized, big games! Some parts actively utilize the fact that game jam enties are generally very small.
:::

This project is mostly me having fun experimenting with different things and see what works out for me when prototyping stuff.

There is a big emphasis on developer experience and a lot of decisions are based on the fact that things developed on this code are generally pretty small and mostly being played on desktop computers.

E.g. declarative rendering, **especially in the way it is implemented here**, has a huge performance hit. But it allows for way faster iterations and the performance hit was no concern so far because the games are just too small to notice in practice.
