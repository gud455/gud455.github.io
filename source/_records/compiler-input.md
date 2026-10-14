---
title: 编译原理实验：我怎样处理输入与多字符符号
summary: 整理 PTA 与 C++ 实验中的输入经验：跳过空行、手动按空白分词，以及避免把文法符号当作单字符。
section: notes
kind: 编译原理
status: 经验整理
period: 2026.09—10
order: 5
featured: true
tags:
- C++
- 编译原理
nav_section: notes
updated: '2026-10-14'
back_url: /notes/
back_label: 学习笔记
---
## 我遇到的输入问题

在编译原理实验中，我接触了 FIRST、FOLLOW、算符优先分析以及 SLR / LR 等算法。算法逻辑之外，输入处理也会直接影响程序是否得到正确结果。

## 我现在采用的原则

- 需要整行读取时使用 `getline`。
- 空行不计入有效输入行数。
- 不使用 `stringstream` 或 `istringstream`，改用手写分词函数。
- 所有文法符号按字符串处理，不假设非终结符一定只有一个字符。
- 空格可能是分词边界，不能一律删除。
- 没有明确要求时，不假设符号必须使用尖括号包围。

## 按空白分词的一个小工具

```cpp
vector<string> words(const string& s) {
    vector<string> a;
    for (size_t i = 0; i < s.size();) {
        while (i < s.size() and isspace((unsigned char)s[i])) ++i;
        if (i == s.size()) break;
        size_t j = i;
        while (i < s.size() and not isspace((unsigned char)s[i])) ++i;
        a.push_back(s.substr(j, i - j));
    }
    return a;
}
```

这段代码只处理空白分隔的输入。如果题目允许连续书写文法符号，还需要结合已知符号表进行匹配，不能把它当作所有格式的通用解析器。

## 让我印象深的收获

输入规则、算法规则和输出格式需要一起核对。多字符符号、空产生式、结束符与列宽都应在题意中确认，不能只根据一个样例做假设。

之后我会继续把具体题目的输入约定与边界样例补到对应实验记录里。
