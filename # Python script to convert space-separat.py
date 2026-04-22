# Python script to convert space-separated numeric ASCII codes into JSON
# Usage:
#  - Save your numeric data to a text file and run: python convert_ascii_to_json.py input.txt
#  - Or pipe the data: cat input.txt | python convert_ascii_to_json.py

import sys
import re
import json


def convert_numbers_to_string(nums):
    out_chars = []
    for n in nums:
        try:
            x = int(n)
        except ValueError:
            continue
        # printable ASCII range
        if 32 <= x <= 126:
            out_chars.append(chr(x))
        elif x == 10:
            out_chars.append('\n')
        elif x == 13:
            out_chars.append('\r')
        elif x == 9:
            out_chars.append('\t')
        else:
            # represent non-printable / extended bytes as unicode escape sequences
            out_chars.append('\\u%04x' % (x & 0xFFFF))
    return ''.join(out_chars)


def main():
    if len(sys.argv) > 1:
        path = sys.argv[1]
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                data = f.read()
        except Exception as e:
            print(json.dumps({"error": f"Failed to read file: {e}"}))
            return
    else:
        data = sys.stdin.read()

    nums = re.findall(r"\d+", data)
    converted = convert_numbers_to_string(nums)

    # Produce a simple JSON object with the converted string
    output = {
        "converted": converted
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
