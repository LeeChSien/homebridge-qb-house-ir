# homebridge-qb-house-ir

## Prerequisite

1. Install LIRC on your device ([ref](https://devkimchi.com/2020/08/12/turning-raspberry-pi-into-remote-controller/))
2. Copy lirc configs from `./lirc` to `/etc/lirc/lircd.conf.d/`

## Usage

Add new platform to Homebridge config json.

```js
"platforms": [
  {
    "platform": "QBHouseIR",
    "name": "QB House IR"
  }
]
```
