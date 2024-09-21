import type { PlatformAccessory, Service, PlatformConfig } from 'homebridge'
import { exec } from 'child_process'

import type { IRPlatform } from './IRPlatform.js'
import { PLATFORM_NAME, PLUGIN_NAME, FIXED_LIGHT_ID } from './settings.js'
import { LightLevel } from './types.js'

enum Power {
  ON = 'ON',
  OFF = 'OFF',
}

export class IRLightAccessory {
  public accessory!: PlatformAccessory
  private service!: Service
  private state = {
    power: Power.OFF as Power,
    level: LightLevel.LEVEL_1 as LightLevel, // level 1 is the highest
  }

  constructor(
    private readonly platform: IRPlatform,
    private readonly configs: PlatformConfig,
  ) {
    // do nothing
  }

  async init() {
    const uuid = this.platform.api.hap.uuid.generate(FIXED_LIGHT_ID)

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
        FIXED_LIGHT_ID,
      )

    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb)

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.configs.name} Ceiling Light`,
    )

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(async (value) => {
        const newState = value ? Power.ON : Power.OFF
        if (newState !== this.state.power) {
          this.state.power = newState
          exec('irsend SEND_ONCE livingroom_light TOGGLE')
        }
      })
      .onGet(() => this.state.power === Power.ON)

    /*
    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .setProps({ minValue: 1, maxValue: 4, minStep: 1 })
      .onSet(async (value) => {
        const newLevel = value as number
        const currentLevel = this.state.level as number
        const distance =
          newLevel > currentLevel
            ? newLevel - currentLevel
            : newLevel + 4 - currentLevel

        for (let i = 0; i < distance; i++) {
          exec(`irsend SEND_ONCE livingroom_light LEVEL`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      })
      .onGet(() => this.state.level)
    */
  }
}
