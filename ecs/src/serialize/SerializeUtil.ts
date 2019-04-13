import { Entity } from "../ecs/Entity";
import { Component } from "../ecs/Component";
import { KEY_SERIALIZE, ISerializable, KEY_UUID, IBaseClass } from "./types";
import { Asset } from "../asset/Asset";

export { SerializeUtil };

/**
 * @internal
 */
interface IObjectFactory {
    createEntity(className: string): Entity | null;
}

/**
 * 序列化/反序列化 ⚠️(实现内部) 用到的一些工具函数
 * @internal
 */
class SerializeUtil {
    public static factory: IObjectFactory | null = null;
    public static propertyHasGetterAndSetter(target: any, propName: string): boolean {
        let prototype = Object.getPrototypeOf(target);

        while (prototype) {
            const descriptror = Object.getOwnPropertyDescriptor(prototype, propName);
            if (descriptror && descriptror.get && descriptror.set) {
                return true;
            }

            prototype = Object.getPrototypeOf(prototype);
        }
        return false;
    }

    public static equal(source: any, target: any): boolean {
        const typeSource = typeof source;
        const typeTarget = typeof target;

        // 最基本的类型要一致
        if (typeSource !== typeTarget) {
            return false;
        }

        // null 的处理
        if (source === null && target === null) {
            return true;
        }
        if (source === null || target === null) {
            return false;
        }
        // 非 null 非 object, 即用严格比较
        if (typeSource !== 'object') {
            return source === target;
        }

        if (
            (Array.isArray(source) || ArrayBuffer.isView(source)) &&
            (Array.isArray(target) || ArrayBuffer.isView(target))
        ) {
            const sl = (source as any[]).length;
            if (sl !== (target as any[]).length) {
                return false;
            }

            if (sl === 0) {
                return true;
            }

            for (let i = 0; i < sl; ++i) {
                if (!this.equal((source as any[])[i], (target as any[])[i])) {
                    return false;
                }
            }

            return true;
        }

        if (source.constructor !== target.constructor) {
            return false;
        }

        if (
            source instanceof Asset ||
            source instanceof Entity ||
            source instanceof Component
        ) {
            return source === target;
        }

        if (source.constructor === Object) {
            for (const k in source) {
                if (!this.equal(source[k], target[k])) {
                    return false;
                }
            }

            return true;
        }

        if (KEY_SERIALIZE in source) {
            return this.equal(
                (source as ISerializable).serialize(),
                (target as ISerializable).serialize()
            );
        }

        if (KEY_UUID in source) {
            for (const k in source) {
                if (!this.equal(source[k], target[k])) {
                    return false;
                }
            }
        }
        throw new Error("Unsupported data.");
    }

    public static getDeserializedKeys(serializedClass: IBaseClass, keys: { [key: string]: string } = {}) {
        const serializeKeys = serializedClass.__serializeKeys;

        if (serializeKeys) {
            keys = keys;

            for (const k in serializeKeys) {
                keys[k] = serializeKeys[k] || k;
            }
        }

        if (serializedClass.prototype && serializedClass.prototype.__proto__.constructor !== Object) {
            this.getDeserializedKeys(serializedClass.prototype.__proto__.constructor, keys);
        }

        return keys;
    }

    public static getDeserializedIgnoreKeys(serializedClass: IBaseClass, keys: string[] | null = null) {
        if (serializedClass.__deserializeIgnore) {
            keys = keys || [];

            for (const key of serializedClass.__deserializeIgnore) {
                keys.push(key);
            }
        }

        if (serializedClass.prototype && serializedClass.prototype.__proto__.constructor !== Object) {
            this.getDeserializedIgnoreKeys(serializedClass.prototype.__proto__.constructor, keys);
        }

        return keys;
    }
}