<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInitaf271a0da31e0d54e26bf2f364e05b15
{
    public static $prefixesPsr0 = array (
        'P' => 
        array (
            'PhpConsole' => 
            array (
                0 => __DIR__ . '/..' . '/php-console/php-console/src',
            ),
        ),
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixesPsr0 = ComposerStaticInitaf271a0da31e0d54e26bf2f364e05b15::$prefixesPsr0;

        }, null, ClassLoader::class);
    }
}