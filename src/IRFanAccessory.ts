import type { PlatformAccessory, Service, PlatformConfig } from 'homebridge'
import { exec } from 'child_process'

import type { IRPlatform } from './IRPlatform.js'
import { PLATFORM_NAME, PLUGIN_NAME, FIXED_FAN_ID } from './settings.js'
import { FanDirection, FanLevel, Power } from './types.js'

export class IRFanAccessory {
  public accessory!: PlatformAccessory
  private service!: Service
  private state = {
    power: Power.OFF as Power,
    level: FanLevel.LEVEL_2 as FanLevel,
    direction: FanDirection.DOWN as FanDirection,
  }

  constructor(
    private readonly platform: IRPlatform,
    private readonly configs: PlatformConfig,
  ) {
    // do nothing
  }

  async init() {
    const uuid = this.platform.api.hap.uuid.generate(FIXED_FAN_ID)

    const existingAccessory = this.platform.accessories.find(
      (accessory) => accessory.UUID === uuid,
    )

    if (existingAccessory) {
      this.accessory = existingAccessory
    } else {
      this.accessory = new this.platform.api.platformAccessory(
        this.configs.name as string,
        uuid,
      )
      this.accessory.context.device = this.configs
      this.platform.api.registerPlatformAccessories(
        PLUGIN_NAME,
        PLATFORM_NAME,
        [this.accessory],
      )
    }

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        FIXED_FAN_ID,
      )

    this.service =
      this.accessory.getService(this.platform.Service.Fanv2) ||
      this.accessory.addService(this.platform.Service.Fanv2)

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.configs.name} Fan`,
    )

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .onSet(async (value) => {
        this.state.power = value ? Power.ON : Power.OFF
        if (this.state.power === Power.OFF) {
          exec('irsend SEND_ONCE livingroom_fan OFF')
        } else {
          switch (this.state.level) {
            case FanLevel.LEVEL_1:
              exec('irsend SEND_ONCE livingroom_fan ON_WITH_LEVEL_1')
              break
            case FanLevel.LEVEL_2:
              exec('irsend SEND_ONCE livingroom_fan ON_WITH_LEVEL_2')
              break
            case FanLevel.LEVEL_3:
              exec('irsend SEND_ONCE livingroom_fan ON_WITH_LEVEL_3')
              break
            default:
              exec('irsend SEND_ONCE livingroom_fan ON_WITH_LEVEL_2')
          }
        }
      })
      .onGet(() => this.state.power === Power.ON)

    this.service
      .getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .setProps({ minValue: 1, maxValue: 100, minStep: 1 })
      .onSet((value) => {
        const level = Math.ceil((value as number) / 33)
        if (level === 0) {
          exec('irsend SEND_ONCE livingroom_fan OFF')
          this.state.power = Power.OFF
          this.service.updateCharacteristic(
            this.platform.Characteristic.Active,
            false,
          )
        } else if (level !== this.state.level) {
          exec(`irsend SEND_ONCE livingroom_fan LEVEL_${level}`)
        }
        this.state.level = level as FanLevel
      })
      .onGet(() => this.state.level * 33)

    const { CLOCKWISE, COUNTER_CLOCKWISE } =
      this.platform.Characteristic.RotationDirection
    this.service
      .getCharacteristic(this.platform.Characteristic.RotationDirection)
      .onSet(async (value) => {
        this.state.direction =
          value === CLOCKWISE ? FanDirection.UP : FanDirection.DOWN
        exec('irsend SEND_ONCE livingroom_fan REVERSE')
      })
      .onGet(() =>
        this.state.direction === FanDirection.DOWN
          ? COUNTER_CLOCKWISE
          : CLOCKWISE,
      )
  }
}
