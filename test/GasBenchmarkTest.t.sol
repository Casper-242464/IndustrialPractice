// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

contract GasBenchmarkTest is Test {
    function test_Gas_Solidity_Sqrt() public {
        uint256 y = 10 ** 18;
        uint256 z;
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function test_Gas_Yul_Sqrt() public {
        uint256 y = 10 ** 18;
        uint256 z;
        assembly {
            z := 1
            if gt(y, 3) {
                z := y
                let x := add(div(y, 2), 1)
                for {} lt(x, z) {} {
                    z := x
                    x := div(add(div(y, x), x), 2)
                }
            }
            if iszero(y) { z := 0 }
        }
    }
}
